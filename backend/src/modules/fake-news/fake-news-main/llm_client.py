"""
Wrapper commun pour interroger un modèle local, via Ollama OU LM Studio.

Pourquoi ce module existe :
- Centraliser l'appel au LLM (URL, modèle, gestion d'erreurs) pour que
  claim_extraction.py, query_generation.py et synthesis.py n'aient pas
  chacun leur propre logique d'appel HTTP.
- Forcer une sortie JSON stricte pour que les autres modules puissent
  parser la réponse sans avoir à nettoyer des ```json ... ``` ou du texte
  parasite.

Les deux backends n'ont pas la même API :
- Ollama expose /api/generate (format propriétaire, {"response": "..."}).
- LM Studio expose un serveur compatible OpenAI : /v1/chat/completions
  (format {"choices": [{"message": {"content": "..."}}]}).

Le choix du backend se fait via la variable d'environnement LLM_BACKEND
("ollama" ou "lmstudio", "ollama" par défaut).

Prérequis Ollama :
    1. Installer Ollama : https://ollama.com
    2. Télécharger un modèle, ex : `ollama pull mistral`
    3. Lancer le serveur (généralement automatique) : `ollama serve`

Prérequis LM Studio :
    1. Installer LM Studio : https://lmstudio.ai
    2. Télécharger un modèle dans l'onglet "Discover" (ex: Mistral 7B Instruct)
    3. Onglet "Local Server" (icône <->) : sélectionner le modèle, cliquer
       "Start Server" (par défaut sur http://localhost:1234)
"""

import json
import os
import re
import sys
from dataclasses import dataclass
from typing import Any, Optional

import requests
from dotenv import load_dotenv

load_dotenv()

LLM_BACKEND = os.getenv("LLM_BACKEND", "ollama").lower()  # "ollama" ou "lmstudio"

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

LMSTUDIO_HOST = os.getenv("LMSTUDIO_HOST", "http://localhost:1234")
# LM Studio ignore généralement ce champ si un seul modèle est chargé dans
# le serveur local, mais l'API OpenAI l'exige quand même dans la requête.
LMSTUDIO_MODEL = os.getenv("LMSTUDIO_MODEL", "local-model")

# Le modèle a parfois besoin de plus de temps que les valeurs par défaut de
# `requests` sur une machine sans GPU dédié.
DEFAULT_TIMEOUT_SECONDS = 120

# Affiche la réponse brute du LLM sur stderr à chaque échec de parsing JSON
# (jamais sur stdout, donc ça ne casse jamais la sortie JSON de main.py).
# Mets DEBUG_LLM=1 dans ton .env pour l'activer et voir pourquoi un appel
# échoue au lieu de deviner.
DEBUG_LLM = os.getenv("DEBUG_LLM", "0") == "1"


class LLMError(RuntimeError):
    """Erreur levée quand l'appel au LLM échoue ou renvoie un JSON invalide."""


@dataclass
class LLMResponse:
    raw_text: str
    parsed_json: Optional[dict[str, Any]] = None


def _json_candidates(raw_text: str) -> list[str]:
    """Retourne plusieurs variantes possibles d'un payload JSON pour tenter un parsing tolérant."""
    text = (raw_text or "").strip()
    if not text:
        return []

    candidates: list[str] = []

    # Cas courant : le modèle renvoie du JSON dans un bloc Markdown.
    fenced = re.search(r"```(?:json)?\s*(.+?)\s*```", text, flags=re.IGNORECASE | re.DOTALL)
    if fenced:
        candidates.append(fenced.group(1).strip())

    # Cas courant : le modèle ajoute une phrase de contexte avant/après le JSON.
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        candidates.append(text[start : end + 1].strip())

    # Cas de base : le texte est déjà un JSON valide ou presque.
    candidates.append(text)

    # Déduplication conservant l'ordre.
    unique_candidates: list[str] = []
    for candidate in candidates:
        if candidate not in unique_candidates:
            unique_candidates.append(candidate)
    return unique_candidates


def _try_parse_json(raw_text: str) -> Optional[dict[str, Any]]:
    """Tente de parser le texte brut comme JSON, en récupérant un bloc JSON si besoin."""
    for candidate in _json_candidates(raw_text):
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue

        if isinstance(parsed, dict):
            return parsed

    return None


def _call_ollama(prompt: str, system_prompt: Optional[str], expect_json: bool, temperature: float) -> str:
    payload: dict[str, Any] = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": temperature},
    }
    if system_prompt:
        payload["system"] = system_prompt
    if expect_json:
        payload["format"] = "json"

    try:
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json=payload,
            timeout=DEFAULT_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise LLMError(
            f"Impossible de contacter Ollama sur {OLLAMA_HOST} "
            f"(le serveur est-il lancé ? `ollama serve`) : {exc}"
        ) from exc

    return response.json().get("response", "")


def _call_lmstudio(prompt: str, system_prompt: Optional[str], expect_json: bool, temperature: float) -> str:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload: dict[str, Any] = {
        "model": LMSTUDIO_MODEL,
        "messages": messages,
        "temperature": temperature,
        "stream": False,
    }
    if expect_json:
        # Format compatible OpenAI, supporté par la plupart des serveurs
        # LM Studio récents. Si ton modèle/version l'ignore, le prompt
        # système qui demande explicitement du JSON prend le relais.
        payload["response_format"] = {"type": "json_object"}

    try:
        response = requests.post(
            f"{LMSTUDIO_HOST}/v1/chat/completions",
            json=payload,
            timeout=DEFAULT_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise LLMError(
            f"Impossible de contacter LM Studio sur {LMSTUDIO_HOST} "
            f"(le serveur local est-il démarré ? Onglet 'Local Server' "
            f"> 'Start Server') : {exc}"
        ) from exc

    body = response.json()
    try:
        return body["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as exc:
        raise LLMError(f"Réponse LM Studio inattendue : {body}") from exc


def call_llm(
    prompt: str,
    system_prompt: Optional[str] = None,
    expect_json: bool = True,
    temperature: float = 0.1,
) -> LLMResponse:
    """
    Envoie un prompt au modèle local (Ollama ou LM Studio, selon
    LLM_BACKEND) et retourne sa réponse.

    Args:
        prompt: le prompt utilisateur.
        system_prompt: instructions système (rôle, format attendu, langue...).
        expect_json: si True, demande au backend de produire un JSON valide
            et tente de le parser (le pipeline s'appuie sur ce JSON).
        temperature: basse par défaut (0.1) car on veut des extractions et
            classifications reproductibles, pas de la créativité.

    Raises:
        LLMError: si la requête HTTP échoue, si LLM_BACKEND est inconnu, ou
            si expect_json=True mais que la réponse n'est pas un JSON valide.
    """
    if LLM_BACKEND == "ollama":
        raw_text = _call_ollama(prompt, system_prompt, expect_json, temperature)
    elif LLM_BACKEND == "lmstudio":
        raw_text = _call_lmstudio(prompt, system_prompt, expect_json, temperature)
    else:
        raise LLMError(
            f"LLM_BACKEND inconnu : {LLM_BACKEND!r} (attendu 'ollama' ou 'lmstudio')"
        )

    parsed_json = None
    if expect_json:
        parsed_json = _try_parse_json(raw_text)
        if parsed_json is None:
            if DEBUG_LLM:
                print(
                    f"[DEBUG_LLM] JSON invalide reçu de {LLM_BACKEND} "
                    f"(system_prompt={'oui' if system_prompt else 'non'}):\n"
                    f"--- réponse brute ---\n{raw_text}\n--- fin ---",
                    file=sys.stderr,
                )
            raise LLMError(
                f"Le LLM n'a pas renvoyé un JSON valide : {raw_text[:200]!r}"
            )

    if DEBUG_LLM:
        print(
            f"[DEBUG_LLM] Réponse OK de {LLM_BACKEND} : {raw_text[:300]!r}",
            file=sys.stderr,
        )

    return LLMResponse(raw_text=raw_text, parsed_json=parsed_json)
