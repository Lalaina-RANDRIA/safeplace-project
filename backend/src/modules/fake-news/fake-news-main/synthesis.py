"""
Étape 5 du pipeline : synthèse & fact-checking (LLM).

Compare la claim initiale aux preuves collectées et pondérées (étapes 3-4)
et produit un verdict structuré, conforme à ton plan section 3 (statut,
score de confiance, justification, sources d'ancrage).
"""

import json
import os
import sys
from dataclasses import dataclass, field

from claim_extraction import Claim
from credibility import WeightedResult
from llm_client import LLMError, call_llm

DEBUG_LLM = os.getenv("DEBUG_LLM", "0") == "1"

VALID_STATUSES = {"Vrai", "Faux", "Partiellement Faux", "Non Vérifiable"}

# Normalise des variantes plausibles que Mistral pourrait produire malgré la
# consigne stricte (ex: anglicismes, casse différente) vers nos 4 statuts
# officiels. Toute clé absente de ce mapping ET absente de VALID_STATUSES
# tombe sur le verdict de repli — mieux vaut sur-déclencher le repli que
# d'accepter un statut inventé.
STATUS_ALIASES = {
    "vrai": "Vrai",
    "true": "Vrai",
    "faux": "Faux",
    "false": "Faux",
    "partiellement faux": "Partiellement Faux",
    "partially false": "Partiellement Faux",
    "mixed": "Partiellement Faux",
    "misleading": "Partiellement Faux",
    "trompeur": "Partiellement Faux",
    "non vérifiable": "Non Vérifiable",
    "non verifiable": "Non Vérifiable",
    "unverifiable": "Non Vérifiable",
    "unknown": "Non Vérifiable",
}


def _normalize_status(raw_status) -> str | None:
    """Ramène un statut brut du LLM vers un des VALID_STATUSES, ou None."""
    if not isinstance(raw_status, str):
        return None
    key = raw_status.strip().lower()
    if raw_status.strip() in VALID_STATUSES:
        return raw_status.strip()
    return STATUS_ALIASES.get(key)


def _normalize_confidence(raw_confidence) -> int | None:
    """Ramène une confiance brute (int, float ou string numérique) vers un
    entier 0-100, ou None si la valeur est inexploitable."""
    if isinstance(raw_confidence, bool):
        return None

    if isinstance(raw_confidence, (int, float)):
        numeric = raw_confidence
    elif isinstance(raw_confidence, str):
        text = raw_confidence.strip()
        if not text:
            return None

        # Accepte les formats courants renvoyés par les modèles :
        # "60", "60%", "0.6", "0,6", " 80 ".
        numeric_text = text.replace("%", "").replace(",", ".")
        try:
            numeric = float(numeric_text)
        except ValueError:
            return None
    else:
        return None

    # Certains modèles renvoient une proportion (0.8) au lieu d'un
    # pourcentage (80) malgré la consigne. On détecte ce cas : une
    # confiance entre 0 et 1 (exclus 0 et 1 pile, ambigus) est traitée
    # comme une proportion et remise à l'échelle.
    if 0 < numeric < 1:
        value = round(numeric * 100)
    else:
        value = round(numeric)

    return max(0, min(100, value))

SYSTEM_PROMPT = """Tu es un module de fact-checking. Tu reçois une \
affirmation et des preuves déjà triées par fiabilité.

RÈGLES ABSOLUES :
1. Réponds UNIQUEMENT en JSON valide, sans code fence, sans texte avant ni après.
2. La réponse doit être exactement un objet JSON avec ces clés :
   {"status": "Vrai" | "Faux" | "Partiellement Faux" | "Non Vérifiable", "confidence": <entier 0-100>, "justification": "<1 à 2 phrases>"}
3. Ne renvoie jamais une liste, un objet "evidence", ni des champs supplémentaires.
4. Si les preuves sont faibles, absentes ou ne permettent pas de vérifier l'affirmation, réponds : {"status": "Non Vérifiable", "confidence": 0, "justification": "Peu de preuves fiables disponibles pour vérifier cette affirmation."}

Considère les preuves les plus fiables en premier et accorde plus de poids aux sources institutionnelles et reconnues.
"""


@dataclass
class Verdict:
    claim: Claim
    status: str
    confidence: int
    justification: str
    sources: list[str] = field(default_factory=list)


def _fallback_verdict(claim: Claim, sources: list[str]) -> Verdict:
    """Verdict de repli si le LLM est indisponible ou renvoie un JSON invalide."""
    return Verdict(
        claim=claim,
        status="Non Vérifiable",
        confidence=0,
        justification=(
            "La synthèse automatique a échoué (LLM indisponible ou réponse "
            "invalide). Vérification manuelle recommandée."
        ),
        sources=sources,
    )


def _compact_evidence_payload(weighted_results: list[WeightedResult]) -> list[dict[str, str | float]]:
    """Limite la taille du prompt envoyé au LLM pour éviter les réponses non structurées."""
    compact_results: list[dict[str, str | float]] = []
    for item in weighted_results[:5]:
        excerpt = item.result.content.strip()
        if len(excerpt) > 500:
            excerpt = excerpt[:500].rstrip() + " [...]"
        compact_results.append(
            {
                "source": item.result.title,
                "url": item.result.url,
                "excerpt": excerpt,
                "reliability_weight": round(item.weight, 2),
            }
        )
    return compact_results


def synthesize_verdict(claim: Claim, weighted_results: list[WeightedResult]) -> Verdict:
    """
    Produit un verdict final pour une claim à partir des preuves pondérées.

    Args:
        claim: l'affirmation évaluée.
        weighted_results: preuves triées par crédibilité (sortie de
            credibility.score_results()).

    Returns:
        Un Verdict complet, y compris en cas d'échec du LLM (avec un statut
        "Non Vérifiable" plutôt qu'une exception, pour ne pas interrompre le
        traitement des autres claims du pipeline).
    """
    sources = [item.result.url for item in weighted_results]

    evidence_payload = _compact_evidence_payload(weighted_results)

    # On compare les preuves à reasoning_text : pour un claim MG, c'est la
    # traduction française (si disponible), car comparer deux textes en
    # français est nettement plus fiable pour le LLM local que de comparer
    # un claim malgache à des preuves.
    prompt = json.dumps(
        {"claim": claim.reasoning_text, "evidence": evidence_payload},
        ensure_ascii=False,
    )

    try:
        response = call_llm(prompt=prompt, system_prompt=SYSTEM_PROMPT, temperature=0.0)
    except LLMError:
        return _fallback_verdict(claim, sources)

    data = response.parsed_json or {}
    status = _normalize_status(data.get("status"))
    confidence = _normalize_confidence(data.get("confidence"))
    justification = data.get("justification")

    if status is None or confidence is None or not justification:
        if DEBUG_LLM:
            print(
                f"[DEBUG_LLM] Normalisation échouée pour la claim "
                f"{claim.text!r} — JSON reçu : {data!r}",
                file=sys.stderr,
            )
        return _fallback_verdict(claim, sources)

    return Verdict(
        claim=claim,
        status=status,
        confidence=confidence,
        justification=justification,
        sources=sources,
    )
