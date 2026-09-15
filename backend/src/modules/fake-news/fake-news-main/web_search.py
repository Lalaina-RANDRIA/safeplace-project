"""
Étape 3 du pipeline : recherche web live (Tavily).

Pourquoi Tavily : contrairement à un moteur de recherche classique, Tavily
renvoie directement un extrait de contenu nettoyé par résultat (`content`),
ce qui évite d'écrire un scraper séparé pour chaque source — exactement ce
dont on a besoin pour l'étape 5 (comparaison claim vs preuves).

Documentation : https://docs.tavily.com
"""

import os
from dataclasses import dataclass

from dotenv import load_dotenv
from tavily import TavilyClient

load_dotenv()

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

MAX_RESULTS_PER_QUERY = 5


@dataclass
class SearchResult:
    url: str
    title: str
    content: str  # extrait de contenu déjà nettoyé par Tavily


def _get_client() -> TavilyClient | None:
    if not TAVILY_API_KEY:
        return None
    return TavilyClient(api_key=TAVILY_API_KEY)


def search(query: str, language: str) -> list[SearchResult]:
    """
    Interroge Tavily pour une requête donnée.

    Args:
        query: la requête générée à l'étape 2.
        language: "fr" ou "mg" — non utilisé pour restreindre la recherche
            (FR et MG sont traités de façon identique : recherche large,
            sans filtre de domaine). Gardé dans la signature pour rester
            disponible si une stratégie différente par langue est
            nécessaire plus tard ; la priorisation des sources fiables se
            fait après coup, dans credibility.py.

    Returns:
        Liste de SearchResult (peut être vide si aucun résultat, si
        l'appel API échoue ou si Tavily n'est pas configuré).
    """
    client = _get_client()
    if client is None:
        return []

    try:
        raw_response = client.search(
            query=query,
            max_results=MAX_RESULTS_PER_QUERY,
            search_depth="advanced",  # récupère du contenu plus complet
        )
    except Exception:
        # Une panne réseau ou un quota Tavily épuisé ne doit pas faire
        # planter tout le pipeline : on retourne aucune preuve pour cette
        # requête, la synthèse (étape 5) traitera ça comme "non vérifiable".
        return []

    return _parse_results(raw_response)


def _parse_results(raw_response: dict) -> list[SearchResult]:
    results = []
    for item in raw_response.get("results", []):
        results.append(
            SearchResult(
                url=item.get("url", ""),
                title=item.get("title", ""),
                content=item.get("content", ""),
            )
        )
    return results
