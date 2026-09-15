"""
Traduction interne malgache -> français.

Pourquoi ce module : Mistral (et la plupart des LLM open-source) raisonnent
nettement mieux en français qu'en malgache, une langue très peu représentée
dans leurs données d'entraînement. Traduire est une tâche beaucoup plus
fiable pour un LLM que raisonner directement dans une langue rare.

Le texte malgache original n'est JAMAIS remplacé : ce module ne fait
qu'ajouter une traduction à côté, utilisée en interne par
query_generation.py et synthesis.py. L'utilisateur final continue de voir
le claim en malgache dans l'overlay (étape 6).
"""

import re

from llm_client import LLMError, call_llm

SYSTEM_PROMPT = """Tu es un traducteur malgache -> français. Traduis \
fidèlement le texte donné, sans l'interpréter ni le résumer. Si le texte \
semble ambigu ou si tu n'es pas sûr, renvoie le texte original en français \
seulement si tu peux le reformuler sans changer le sens. Réponds \
STRICTEMENT en JSON :
{"translation": "<traduction en français>"}
"""

VEHICLE_AND_ACCIDENT_WORDS = {
    "moto", "motocyclette", "machine", "voiture", "auto", "véhicule",
    "vehicule", "camion", "bus", "collision", "accident", "heurt",
    "renvers", "fandona", "nifandona", "nifanihiny", "niforonina"
}

FIRE_WORDS = {
    "feu", "incendie", "allume", "allumé", "allum", "flamme", "brule", "brûle"
}


def _normalize_text(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^a-zà-ÿ0-9]+", " ", text)
    return [token for token in text.split() if len(token) > 1]


def _looks_like_hallucinated_translation(original_text: str, translated_text: str) -> bool:
    """Détecte les cas où une traduction invente un sens totalement différent."""
    if not original_text or not translated_text:
        return False

    original_tokens = set(_normalize_text(original_text))
    translated_tokens = set(_normalize_text(translated_text))

    if not original_tokens or not translated_tokens:
        return False

    original_vehicle_tokens = original_tokens & VEHICLE_AND_ACCIDENT_WORDS
    translated_fire_tokens = translated_tokens & FIRE_WORDS
    translated_vehicle_tokens = translated_tokens & VEHICLE_AND_ACCIDENT_WORDS

    # Cas 1 : le texte traduit parle de feu/incendie alors que l'original
    # parlait d'un véhicule ou d'un accident -> hallucination claire.
    if original_vehicle_tokens and translated_fire_tokens:
        return True

    # Cas 2 : l'original évoque un véhicule/accident, mais la traduction n'a
    # quasiment aucun mot partagé avec le texte original et change complètement
    # la signification. Ce cas est conservateur : on préfère ne pas traduire
    # plutôt que d'introduire une mauvaise interprétation.
    if original_vehicle_tokens and not translated_vehicle_tokens:
        overlap = original_tokens & translated_tokens
        return len(overlap) <= 1

    # Cas 3 : même si le texte traduit fait encore référence à un véhicule,
    # si le texte original parlait d'un accident ou d'une collision et que la
    # traduction ne contient aucun mot d'action/conséquence partagé, on rejette.
    if original_vehicle_tokens and translated_vehicle_tokens:
        overlap = original_tokens & translated_tokens
        return len(overlap) <= 1

    # Cas 4 (conservateur) : si la traduction partage très peu de vocabulaire
    # avec le texte original, elle est probablement hors sujet. On préfère
    # garder le texte original plutôt que de propager une mauvaise traduction.
    overlap = original_tokens & translated_tokens
    if len(overlap) <= 2 and len(original_tokens) >= 6 and len(translated_tokens) >= 6:
        return True

    return False


def translate_to_french(text_mg: str) -> str | None:
    """
    Traduit un texte malgache en français pour le raisonnement interne.

    Si la traduction est absente ou semble hallucinée, on retourne le texte
    original plutôt que de perdre toute la claim. C'est un comportement plus
    conservateur et évite les faux négatifs sur des phrases malgaches.

    Args:
        text_mg: le texte malgache à traduire (typiquement un claim).

    Returns:
        La traduction française si elle semble fiable, sinon le texte original
        malgache (ou None si le texte d'entrée est vide).
    """
    if not text_mg or not text_mg.strip():
        return None

    try:
        response = call_llm(prompt=text_mg, system_prompt=SYSTEM_PROMPT)
    except LLMError:
        return text_mg

    translation = (response.parsed_json or {}).get("translation", "").strip()
    if not translation:
        return text_mg

    if _looks_like_hallucinated_translation(text_mg, translation):
        return text_mg

    return translation
