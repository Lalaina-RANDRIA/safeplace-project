"""
Orchestrateur du pipeline Agentic RAG de détection de fake news.

Enchaîne les 5 étapes de traitement (l'étape 6, restitution dans l'overlay
de l'extension, est hors du périmètre de ce module Python — elle vivra côté
JS de l'extension, qui appellera ce pipeline via une API, cf README).
"""

from dataclasses import dataclass

from claim_extraction import Claim, extract_claims
from credibility import score_results
from query_generation import generate_queries
from synthesis import Verdict, synthesize_verdict
from web_search import search


@dataclass
class ClaimVerdict:
    claim: Claim
    verdict: Verdict


def run_pipeline(page_text: str) -> list[ClaimVerdict]:
    """
    Exécute le pipeline complet sur le texte d'une page web.

    Args:
        page_text: texte brut de la page (FR et/ou MG).

    Returns:
        Un ClaimVerdict par affirmation détectée dans le texte. Liste vide
        si aucune affirmation vérifiable n'a été trouvée.
    """
    claims = extract_claims(page_text)

    results: list[ClaimVerdict] = []
    for claim in claims:
        all_search_results = []
        for query in generate_queries(claim):
            all_search_results.extend(search(query, language=claim.language))

        weighted_results = score_results(all_search_results, language=claim.language)
        verdict = synthesize_verdict(claim, weighted_results)

        results.append(ClaimVerdict(claim=claim, verdict=verdict))

    return results
