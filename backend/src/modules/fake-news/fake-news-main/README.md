# SafePlace — Module Fake News (Agentic RAG)

Pipeline Python de détection de désinformation (FR/MG) pour l'extension
SafePlace, suivant les 5 étapes de traitement définies dans le plan
(l'étape 6, l'overlay, est gérée côté extension/JS).

## Installation

```bash
python -m venv venv
source venv/bin/activate      # sous Windows : venv\Scripts\activate
pip install -r requirements.txt
```

Installer Ollama (LLM local, gratuit) : https://ollama.com, puis :

```bash
ollama pull mistral
ollama serve
```

Copier `.env.example` en `.env` et renseigner ta clé Tavily (gratuite,
1000 crédits/mois : https://app.tavily.com). Le projet charge
automatiquement ce fichier au démarrage via `python-dotenv`.

## Utilisation

```bash
python main.py "Le gouvernement a annoncé l'augmentation de 20% des taxes dès demain."
```

ou depuis un fichier :

```bash
python main.py --file exemple.txt
```

## Structure

| Fichier | Étape du plan |
|---|---|
| `claim_extraction.py` | 1. Extraction des claims |
| `query_generation.py` | 2. Génération de requêtes |
| `web_search.py` | 3. Recherche web live (Tavily) |
| `credibility.py` | 4. Filtrage / pondération des sources |
| `synthesis.py` | 5. Synthèse & score de véracité (LLM) |
| `pipeline.py` | Orchestrateur des étapes 1→5 |
| `main.py` | Point d'entrée CLI pour tester |

## Prochaines étapes possibles

- Exposer `run_pipeline()` via une petite API Flask/FastAPI pour que
  l'extension (étape 6, overlay) puisse l'appeler en HTTP.
- Ajouter des tests unitaires avec des réponses LLM mockées.
- Affiner le system prompt de `synthesis.py` spécifiquement pour le
  malgache (le plan note la volumétrie de fact-checking limitée en MG).
