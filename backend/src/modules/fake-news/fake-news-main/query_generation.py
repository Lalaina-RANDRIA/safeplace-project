"""
Étape 2 du pipeline : génération de requêtes de recherche.

Reprend la logique de ton plan :
- FR  -> mots-clés ciblés + termes de fact-checking en option
         (cf FR_FACT_CHECK_KEYWORDS dans config/sources.py)
- MG  -> mots-clés ciblant spécifiquement la presse locale, sans ajout de
         vocabulaire "fact check" (peu d'organismes formels en malgache,
         cf plan section 4)
"""

from sources import FR_FACT_CHECK_KEYWORDS
from claim_extraction import Claim
from llm_client import LLMError, call_llm

SYSTEM_PROMPT = """Tu extrais les mots-clés de recherche les plus utiles \
pour vérifier une affirmation sur le web. Réponds STRICTEMENT en JSON :
{"keywords": "<3 à 6 mots-clés séparés par des espaces>"}

Garde les noms propres, chiffres et dates tels quels. Ne traduis rien.
"""


def generate_queries(claim: Claim) -> list[str]:
    """
    Génère une ou plusieurs requêtes de recherche pour une claim donnée.

    Args:
        claim: l'affirmation à vérifier, avec sa langue détectée.

    Returns:
        Liste de requêtes prêtes à envoyer à l'API de recherche web.
        Peut contenir 1 requête (mots-clés bruts) ou 2 (mots-clés bruts +
        variante fact-checking) pour le français.
    """
    # On génère les mots-clés à partir de reasoning_text : pour un claim MG,
    # c'est la traduction française (si elle a réussi), donc le LLM
    # raisonne en français plutôt que directement en malgache.
    try:
        response = call_llm(prompt=claim.reasoning_text, system_prompt=SYSTEM_PROMPT)
        keywords = (response.parsed_json or {}).get("keywords", "").strip()
    except LLMError:
        keywords = ""

    if not keywords:
        # Repli simple : on utilise la phrase telle quelle si le LLM échoue.
        keywords = claim.reasoning_text

    queries = [keywords]

    if claim.language == "fr":
        # On ajoute une variante orientée fact-checking pour prioriser les
        # articles de vérification déjà publiés (étape 3, recherche FR).
        fact_check_term = FR_FACT_CHECK_KEYWORDS[0]
        queries.append(f"{keywords} {fact_check_term}")

    return queries
