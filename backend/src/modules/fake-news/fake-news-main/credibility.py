"""
Étape 4 du pipeline : analyse de la crédibilité des sources.

Attribue un poids à chaque SearchResult en fonction de son domaine, en
s'appuyant sur config/sources.py. C'est volontairement un module séparé de
web_search.py : la recherche (étape 3) et le scoring de fiabilité (étape 4)
sont deux responsabilités différentes, et séparer les deux permet de changer
la stratégie de pondération sans toucher au code d'appel à Tavily.
"""

from dataclasses import dataclass
from urllib.parse import urlparse

from sources import (
    DEFAULT_UNKNOWN_DOMAIN_WEIGHT,
    TRUSTED_DOMAINS_FR,
    TRUSTED_DOMAINS_MG,
    TRUSTED_FACEBOOK_PAGES_MG,
)
from web_search import SearchResult


@dataclass
class WeightedResult:
    result: SearchResult
    domain: str
    weight: float


def _extract_domain(url: str) -> str:
    netloc = urlparse(url).netloc.lower()
    return netloc[4:] if netloc.startswith("www.") else netloc


def _facebook_page_slug(url: str) -> str | None:
    """
    Extrait le slug de page depuis une URL Facebook, ex :
    "https://www.facebook.com/2424mg/posts/123" -> "2424mg"
    "https://www.facebook.com/2424mg" -> "2424mg"

    Retourne None si l'URL ne suit pas ce format (ex : facebook.com/groups/...,
    profils personnels avec ID numérique, etc.) — ces cas retombent alors sur
    DEFAULT_UNKNOWN_DOMAIN_WEIGHT, ce qui est le comportement voulu : on ne
    fait confiance qu'aux pages officielles listées explicitement.
    """
    path_parts = [p for p in urlparse(url).path.split("/") if p]
    return path_parts[0] if path_parts else None


def _weight_for(result: SearchResult, trusted: dict[str, float]) -> tuple[str, float]:
    """Détermine (domaine affiché, poids) pour un résultat donné."""
    domain = _extract_domain(result.url)

    if domain == "facebook.com":
        slug = _facebook_page_slug(result.url)
        if slug and slug in TRUSTED_FACEBOOK_PAGES_MG:
            # On affiche "facebook.com/<slug>" plutôt que juste
            # "facebook.com" pour que ce soit clair dans les sources
            # affichées à l'utilisateur (étape 6) que c'est bien la page
            # officielle du média, pas un post Facebook quelconque.
            return f"facebook.com/{slug}", TRUSTED_FACEBOOK_PAGES_MG[slug]
        return domain, DEFAULT_UNKNOWN_DOMAIN_WEIGHT

    return domain, trusted.get(domain, DEFAULT_UNKNOWN_DOMAIN_WEIGHT)


def score_results(
    results: list[SearchResult], language: str
) -> list[WeightedResult]:
    """
    Attribue un poids de crédibilité à chaque résultat, triés du plus
    fiable au moins fiable.

    Args:
        results: résultats bruts renvoyés par web_search.search().
        language: "fr" ou "mg" — détermine quelle liste de domaines de
            confiance utiliser (et si TRUSTED_FACEBOOK_PAGES_MG s'applique :
            uniquement pertinent pour le malgache actuellement).

    Returns:
        Liste de WeightedResult, triée par poids décroissant.
    """
    trusted = TRUSTED_DOMAINS_FR if language == "fr" else TRUSTED_DOMAINS_MG

    weighted = []
    for result in results:
        domain, weight = _weight_for(result, trusted)
        weighted.append(WeightedResult(result=result, domain=domain, weight=weight))

    weighted.sort(key=lambda item: item.weight, reverse=True)
    return weighted
