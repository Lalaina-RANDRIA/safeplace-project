"""
Étape 1 du pipeline : extraction des affirmations vérifiables.

Approche : on délègue au LLM local (via llm_client) plutôt que d'écrire des
règles regex/spaCy pures, parce que le critère "check-worthy" (chiffres,
événements, citations, accusations, annonces) est justement le genre de
jugement contextuel qu'un LLM fait mieux qu'un filtre mécanique — et parce
qu'il faut gérer le français ET le malgache avec la même logique, alors que
spaCy n'a pas de modèle malgache.

On demande aussi au LLM sa langue perçue (fr/mg) dans le même appel, ce qui
évite un second appel dédié à la détection de langue.
"""

import re
from dataclasses import dataclass

from llm_client import LLMError, call_llm
from translation import translate_to_french

SYSTEM_PROMPT = """Tu es un module d'extraction d'affirmations factuelles \
pour un outil de détection de désinformation. Le texte à analyser peut être \
en français ou en malgache.

Ta tâche : repérer UNIQUEMENT les phrases qui contiennent une affirmation \
vérifiable (chiffres, statistiques, événements datés, citations \
attribuées, accusations, annonces officielles). Ignore les opinions, les \
questions et les phrases purement descriptives sans fait vérifiable.

Réponds STRICTEMENT en JSON, avec cette forme :
{
  "claims": [
    {"text": "<phrase exacte extraite du texte>", "language": "fr"},
    {"text": "<phrase exacte extraite du texte>", "language": "mg"}
  ]
}

Si aucune affirmation vérifiable n'est trouvée, réponds {"claims": []}.
Le champ "language" doit valoir "fr" ou "mg" uniquement.
"""


@dataclass
class Claim:
    text: str
    language: str  # "fr" ou "mg"
    # Traduction française interne, utilisée par query_generation.py et
    # synthesis.py pour raisonner en français plutôt qu'en malgache (le
    # LLM local est nettement plus fiable en FR). None si language == "fr",
    # ou si la traduction a échoué (les modules appelants retombent alors
    # sur `text`).
    text_fr: str | None = None

    @property
    def reasoning_text(self) -> str:
        """Texte à utiliser pour le raisonnement interne (requêtes, synthèse).

        Renvoie la traduction française si disponible, sinon le texte
        original. Centralise ce choix pour que query_generation.py et
        synthesis.py n'aient pas chacun à réimplémenter ce fallback.
        """
        return self.text_fr or self.text


def extract_claims(page_text: str) -> list[Claim]:
    """
    Extrait les affirmations vérifiables d'un texte de page web.

    Args:
        page_text: texte brut extrait de la page (FR et/ou MG mélangés).

    Returns:
        Liste de Claim. Liste vide si le texte ne contient aucune
        affirmation vérifiable ou si le LLM échoue à produire un JSON
        exploitable (on ne fait pas planter tout le pipeline pour ça).
    """
    if not page_text or not page_text.strip():
        return []

    try:
        response = call_llm(prompt=page_text, system_prompt=SYSTEM_PROMPT)
    except LLMError:
        # Le pipeline reste utilisable même si le LLM est indisponible sur
        # ce coup-là : on retourne simplement aucune claim plutôt que de
        # tout interrompre. À voir si tu préfères plutôt logger un warning.
        return []

    raw_claims = (response.parsed_json or {}).get("claims", [])

    # Le LLM peut découper un même contexte en plusieurs sous-claims. Pour
    # éviter qu'un même paragraphe soit ensuite vérifié plusieurs fois
    # indépendamment, on regroupe les résultats par paragraphe source et on
    # ne garde qu'une seule unité de vérification par paragraphe.
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n+', page_text.strip()) if p.strip()]
    if not paragraphs:
        paragraphs = [page_text.strip()]

    paragraph_to_claims: dict[int, list[tuple[str, str]]] = {}
    for item in raw_claims:
        text = (item.get("text") or "").strip()
        language = (item.get("language") or "").strip().lower()
        if not text or language not in {"fr", "mg"}:
            continue

        matched_paragraph_idx = next(
            (idx for idx, paragraph in enumerate(paragraphs) if text in paragraph),
            None,
        )

        if matched_paragraph_idx is None:
            # Cas hors paragraphe (rare) : on garde le texte brut tel quel.
            paragraph_to_claims.setdefault(len(paragraphs), []).append((text, language))
        else:
            paragraph_to_claims.setdefault(matched_paragraph_idx, []).append((text, language))

    claims: list[Claim] = []
    for idx in sorted(paragraph_to_claims):
        paragraph_text = paragraphs[idx] if idx < len(paragraphs) else paragraph_to_claims[idx][0][0]
        language = paragraph_to_claims[idx][0][1]

        text_fr = translate_to_french(paragraph_text) if language == "mg" else None
        claims.append(Claim(text=paragraph_text, language=language, text_fr=text_fr))

    # Fallback conservateur : si aucun regroupement n'a pu être fait,
    # on retombe sur le comportement standard, mais en gardant la logique
    # de regroupement par paragraphe.
    if claims:
        return claims

    for item in raw_claims:
        text = (item.get("text") or "").strip()
        language = (item.get("language") or "").strip().lower()
        if not text or language not in {"fr", "mg"}:
            continue

        text_fr = translate_to_french(text) if language == "mg" else None
        claims.append(Claim(text=text, language=language, text_fr=text_fr))

    return claims
