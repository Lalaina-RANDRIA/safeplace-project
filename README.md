# SafePlace

**SafePlace** est un outil de protection en ligne qui analyse en temps réel le contenu de la page web que vous consultez et vous alerte sur quatre types de risques numériques :

- **Désinformation** — détection de fake news et d'affirmations non vérifiées ;
- **Arnaques / fraudes** — repérage des tentatives de phishing et d'escroquerie ;
- **Toxicité** — insultes, harcèlement, menaces, discours haineux ;
- **Rabbit Hole** — risque d'enfermement algorithmique (spirale de contenus répétitifs).

Le projet cible en priorité le contexte **malgache et francophone** : modèles et marqueurs linguistiques dédiés pour le malgache (`mg`), le français (`fr`) et l'anglais (`en`).

L'outil se présente sous la forme d'une **extension de navigateur** (Chrome / Firefox) qui affiche ses résultats dans un **panneau latéral (side panel)**, adossée à un **backend Node/Express** qui exécute les analyses.

---

## Sommaire

- [SafePlace](#safeplace)
  - [Sommaire](#sommaire)
  - [Fonctionnement](#fonctionnement)
  - [Protection utilisateur](#protection-utilisateur)
    - [Désinformation, Arnaque et Toxicité](#désinformation-arnaque-et-toxicité)
    - [Rabbit Hole](#rabbit-hole)
    - [Accessibilité](#accessibilité)
    - [Implémentation](#implémentation)
  - [Architecture](#architecture)
  - [Stack technique](#stack-technique)
  - [Structure du dépôt](#structure-du-dépôt)
  - [Installation](#installation)
    - [Prérequis](#prérequis)
    - [Étapes](#étapes)
  - [Configuration](#configuration)
  - [Lancement](#lancement)
    - [1. Démarrer le backend](#1-démarrer-le-backend)
    - [2. Lancer l'extension en développement](#2-lancer-lextension-en-développement)
    - [3. Compiler pour la distribution](#3-compiler-pour-la-distribution)
  - [API du backend](#api-du-backend)
    - [`POST /api/fake-news/analyze`](#post-apifake-newsanalyze)
    - [`POST /api/scams/analyze`](#post-apiscamsanalyze)
    - [`POST /api/toxicity/analyze`](#post-apitoxicityanalyze)
    - [`POST /api/rabbit-hole/analyze`](#post-apirabbit-holeanalyze)
    - [`GET /health`](#get-health)
  - [Les modules d'analyse](#les-modules-danalyse)
    - [Désinformation (`fake-news`)](#désinformation-fake-news)
    - [Arnaques (`scams`)](#arnaques-scams)
    - [Toxicité (`toxicity`)](#toxicité-toxicity)
    - [Rabbit Hole (`rabbit-hole`)](#rabbit-hole-rabbit-hole)
    - [Couche ML partagée (`shared/ml`)](#couche-ml-partagée-sharedml)
  - [Pipeline Python (fake news — Agentic RAG)](#pipeline-python-fake-news--agentic-rag)
  - [Scripts disponibles](#scripts-disponibles)
  - [Dépannage](#dépannage)

---

## Fonctionnement

1. L'utilisateur ouvre le side panel de l'extension et clique sur **« Lancer l'analyse »**.
2. Le *service worker* (background) identifie l'onglet actif et demande au **script de contenu** d'extraire la page.
3. Le script de contenu extrait le **titre**, le **texte** et les **liens** via [Readability](https://github.com/mozilla/readability), avec un repli par sélecteurs CSS propres aux réseaux sociaux (Facebook, Instagram, Reddit, TikTok, X, YouTube).
4. Le service worker envoie le contenu extrait au **backend**, qui lance les **4 modules d'analyse en parallèle**.
5. Les résultats sont renvoyés au panneau latéral sous forme de **score de risque global** + un détail par module, puis convertis en vue UI.

> Le pipeline est **résilient** : chaque module est appelé indépendamment ; si un module échoue ou dépasse le délai, l'analyse est marquée `partial` au lieu d'échouer complètement.

---

## Protection utilisateur

SafePlace adapte l'affichage du panneau latéral au type de risque détecté. Cette couche est **purement frontend** : elle réutilise les statuts déjà produits par `analysisToUi.ts`, sans modifier les scores, les modèles, les algorithmes ni le pipeline backend, et sans effectuer d'appel réseau supplémentaire.

### Désinformation, Arnaque et Toxicité

Lorsqu'un risque moyen, élevé ou critique est détecté,
SafePlace masque temporairement le contenu analysé.
L'utilisateur peut choisir de révéler le contenu.

En pratique :

- le masquage se déclenche si **au moins un** des modules `fake-news`, `scams` ou `toxicity` renvoie `medium`, `high` ou `critical` ;
- un voile opaque recouvre l'aperçu du contenu analysé (texte extrait et liens externes) : le texte reste dans le DOM, mais devient difficile à lire ;
- un bouton **« Afficher le contenu »** retire le voile ;
- l'état de révélation est **local au résultat affiché** : il se réinitialise à chaque nouvelle analyse, n'est jamais stocké et ne s'appuie sur aucun état global ni contexte React.

Les modules `low`, `safe`, `unknown`, `insufficient_context`, `error`, `not_available` ou `pending` ne déclenchent aucun masquage.

### Rabbit Hole

SafePlace n'empêche jamais l'accès au contenu.
Une alerte de sensibilisation est affichée lorsque
des signaux de rabbit hole sont détectés.

En pratique :

- l'alerte apparaît si le module `rabbit-hole` renvoie `medium`, `high` ou `critical` ;
- elle prend la forme d'un encart d'avertissement (couleur d'alerte ambre, icône d'attention, message explicite) annoncé par `role="status"` et `aria-live="polite"` ;
- **le contenu analysé reste totalement visible** : Rabbit Hole ne masque jamais le contenu.

### Accessibilité

- le contenu masqué est marqué `aria-hidden` et rendu inerte (`inert`), afin qu'aucun lien sous le voile ne reste atteignable au clavier ou par un lecteur d'écran ;
- le bouton « Afficher le contenu » est un bouton natif, utilisable au clavier, avec anneau de focus visible ; après la révélation, le focus est déplacé sur le contenu rétabli ;
- l'alerte Rabbit Hole est annoncée par les lecteurs d'écran (`role="status"`, `aria-live="polite"`).

### Implémentation

| Fichier | Rôle |
|---|---|
| `entrypoints/sidepanel/utils/riskProtection.ts` | Sélection pure des signaux de risque (consommée via `useMemo`) |
| `entrypoints/sidepanel/types/protection.ts` | Types de la protection (`ModuleRiskSignal`, niveaux de risque) |
| `entrypoints/sidepanel/components/ContentProtectionOverlay.tsx` | Voile opaque et bouton de révélation |
| `entrypoints/sidepanel/components/ProtectedContent.tsx` | État local de révélation, `aria-hidden` / `inert`, gestion du focus |
| `entrypoints/sidepanel/components/RabbitHoleAlert.tsx` | Alerte de sensibilisation Rabbit Hole |
| `entrypoints/sidepanel/components/ExtractedContentView.tsx` | Aperçu du contenu analysé (texte extrait + liens) |

---

## Architecture

```
┌──────────────────────────── Extension (WXT + React) ────────────────────────────┐
│                                                                                 │
│   Side Panel (React)          Service Worker (background)      Content Script    │
│   ┌────────────────┐          ┌───────────────────────┐       ┌──────────────┐  │
│   │  App.tsx       │ START_   │  orchestration,       │ START │ Readability  │  │
│   │  ResultScreen  │ ───────► │  gestion onglet,      │ ────► │ + sélecteurs │  │
│   │  states/…      │ EXTRACT  │  appels backend,      │ EXTR. │ plateformes  │  │
│   └────────────────┘          │  messages erreurs     │       └──────────────┘  │
│          ▲                    └───────────┬───────────┘                          │
│          │ ANALYSIS_RESULT                │ HTTP POST /api/*/analyze             │
└──────────┼────────────────────────────────┼─────────────────────────────────────┘
           │                                ▼
           │              ┌─────────────────────────────────────────┐
           └──────────────│        Backend Express (TypeScript)      │
                          │                                         │
                          │  /api/fake-news   /api/scams            │
                          │  /api/toxicity    /api/rabbit-hole      │
                          │                                         │
                          │  ┌──────────┐  ┌──────────┐             │
                          │  │  ONNX    │  │ Patterns │             │
                          │  │ (IA/ML)  │  │ + règles │             │
                          │  └──────────┘  └──────────┘             │
                          └─────────────────────────────────────────┘
```

Le contrat de message entre les couches est typé dans `types/messaging.ts` :

| Message | Émetteur → Destinataire | Rôle |
|---|---|---|
| `START_EXTRACTION` | Side panel → Service worker | Demande le démarrage d'une analyse |
| `START_EXTRACTION` | Service worker → Content script | Ordonne l'extraction de la page |
| `EXTRACTION_RESULT` | Content script → Service worker | Renvoie le contenu extrait |
| `EXTRACTION_RESULT_FOR_PANEL` | Service worker → Side panel | Transmet le contenu au panneau |
| `ANALYSIS_RESULT` | Service worker → Side panel | Renvoie les résultats des 4 modules |
| `EXTRACTION_ERROR` | Service worker → Side panel | Signale une erreur (onglet, page, script…) |

---

## Stack technique

**Extension / front**

- [WXT](https://wxt.dev) — framework d'extension (build, manifest, HMR)
- [React 19](https://react.dev) + TypeScript
- [Tailwind CSS 3](https://tailwindcss.com) — thème « éditorial / officiel » (voir `tailwind.config.js`)
- [@mozilla/readability](https://github.com/mozilla/readability) — extraction du contenu principal
- [lucide-react](https://lucide.dev) — icônes

**Backend**

- [Express 5](https://expressjs.com) + TypeScript, exécuté via [`tsx`](https://tsx.is)
- [onnxruntime-node](https://onnxruntime.ai) — inférence des modèles ONNX locaux

**Pipeline Python (module fake news)**

- Python 3 + [tavily-python](https://pypi.org/project/tavily-python/) (recherche web), `requests`, `python-dotenv`
- LLM local via [Ollama](https://ollama.com) ou [LM Studio](https://lmstudio.ai)

---

## Structure du dépôt

```
safeplace-proto1/
├── entrypoints/                 # Extension navigateur
│   ├── background.ts            # Entrée background (ré-exporte service_worker)
│   ├── service_worker.ts        # Orchestrateur principal
│   ├── content.ts               # Extraction du contenu de la page
│   ├── services/
│   │   └── api.service.ts       # Client HTTP vers le backend
│   └── sidepanel/               # Interface React du panneau latéral
│       ├── App.tsx              # Machine à états des écrans
│       ├── adapters/            # Conversion analyse → UI (analysisToUi)
│       ├── components/          # Header, Body, ResultScreen, cartes de risque…
│       ├── components/states/   # États : extraction, analyse, erreur…
│       └── types/ui.ts          # Types de la vue
│
├── types/                       # Types partagés de l'extension
│   ├── analysis.ts              # PageAnalysisInput, AnalysisResponse
│   ├── extraction.ts            # ExtractionPayload
│   ├── messaging.ts             # Contrat de messages inter-couches
│   └── navigation.ts            # Écrans (Screen)
│
├── backend/                     # Backend Express
│   └── src/
│       ├── app.ts               # Application Express + CORS
│       ├── server.ts            # Point d'entrée HTTP (port 3000)
│       ├── routes/              # Ré-exports des routes par module
│       ├── modules/
│       │   ├── fake-news/       # Désinformation (+ pipeline Python)
│       │   ├── scams/           # Arnaques / fraudes
│       │   ├── toxicity/        # Toxicité (+ modèles ONNX)
│       │   └── rabbit-hole/     # Enfermement algorithmique (+ ONNX)
│       └── shared/              # Types, services, utils, couche ML
│           ├── ml/onnx/         # Runner ONNX commun
│           └── ml/malagasy/     # Routeur de langue + modèles malgaches
│
├── public/                      # Icônes et logos de l'extension
├── assets/                      # Ressources (logo ISPM, styles)
├── wxt.config.ts                # Config WXT + permissions
└── tailwind.config.js           # Thème et palette
```

---

## Installation

### Prérequis

- **Node.js** 18+ et npm
- Un navigateur Chromium (Chrome, Edge, Brave…) ou Firefox
- *(optionnel, module fake news Python)* **Python 3.10+**

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/Lalaina-RANDRIA/safeplace-project.git
cd safeplace-proto1

# 2. Installer les dépendances (extension + backend)
npm install
```

L'installation déclenche automatiquement `wxt prepare` (génération des types WXT).

Pour installer le pipeline Python du module fake news :

```bash
cd backend/src/modules/fake-news/fake-news-main
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements.txt
```

---

## Configuration

Les variables d'environnement suivantes sont reconnues :

**Extension**

| Variable | Défaut | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | URL de base du backend |

**Backend**

| Variable | Défaut | Description |
|---|---|---|
| `PORT` | `3000` | Port d'écoute du serveur Express |

**Pipeline Python (fake news)** — fichier `.env` dans `fake-news-main/`

| Variable | Défaut | Description |
|---|---|---|
| `LLM_BACKEND` | `ollama` | Backend LLM : `ollama` ou `lmstudio` |
| `OLLAMA_HOST` | `http://localhost:11434` | URL du serveur Ollama |
| `OLLAMA_MODEL` | `mistral` | Modèle Ollama utilisé |
| `LMSTUDIO_HOST` | `http://localhost:1234` | URL du serveur LM Studio |
| `LMSTUDIO_MODEL` | `local-model` | Modèle LM Studio utilisé |
| `TAVILY_API_KEY` | — | Clé API Tavily (recherche web) |
| `DEBUG_LLM` | `0` | Passer à `1` pour tracer les réponses LLM brutes |

> Créez un fichier `.env` (ou `.env.example` à copier) à côté de `pipeline.py`. Une clé Tavily gratuite s'obtient sur [app.tavily.com](https://app.tavily.com).

---

## Lancement

### 1. Démarrer le backend

```bash
# Mode développement (rechargement à chaud)
npm run backend:dev

# Ou en une seule fois
npm run backend:start
```

Le serveur écoute sur `http://localhost:3000`. Vérification :

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

### 2. Lancer l'extension en développement

```bash
npm run dev            # Chrome / Chromium
npm run dev:firefox    # Firefox
```

WXT ouvre un navigateur avec l'extension chargée. Le panneau SafePlace s'ouvre au clic sur l'icône de l'extension.

### 3. Compiler pour la distribution

```bash
npm run build          # Chrome
npm run build:firefox  # Firefox
npm run zip            # Génère une archive .zip
```

---

## API du backend

Toutes les routes sont en `POST` et suivent un format de réponse uniforme :

```jsonc
// Succès
{ "success": true, "data": { /* résultat du module */ } }

// Échec
{ "success": false, "message": "…", "errorCode": "ANALYSIS_FAILED" }
```

Codes d'erreur possibles (`ApiErrorCode`) : `INVALID_REQUEST`, `PAYLOAD_TOO_LARGE`, `INVALID_URL`, `ANALYSIS_FAILED`, `EXTERNAL_SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`.

### `POST /api/fake-news/analyze`

Analyse la désinformation.

```bash
curl -X POST http://localhost:3000/api/fake-news/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://exemple.mg/article","title":"Titre","content":"Le gouvernement a annoncé…"}'
```

### `POST /api/scams/analyze`

Détecte les arnaques / fraudes.

```bash
curl -X POST http://localhost:3000/api/scams/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://exemple.mg","title":"Titre","content":"Gagnez de l'\''argent facilement…"}'
```

### `POST /api/toxicity/analyze`

Détecte la toxicité (insultes, menaces, haine…).

```bash
curl -X POST http://localhost:3000/api/toxicity/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://exemple.mg","title":"Titre","content":"Texte à analyser"}'
```

### `POST /api/rabbit-hole/analyze`

Évalue le risque d'enfermement algorithmique. Ce module attend une liste de contenus :

```bash
curl -X POST http://localhost:3000/api/rabbit-hole/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://exemple.mg","contents":[{"id":"1","title":"Titre","text":"Texte du contenu"}]}'
```

### `GET /health`

`{"status":"ok"}` — vérification de disponibilité.

> **CORS** : seules les origines `http://localhost:3000`, `http://127.0.0.1:3000` et les extensions (`chrome-extension://`, `moz-extension://`) sont autorisées.

---

## Les modules d'analyse

Chaque module suit la même structure interne : `controllers/`, `routes/`, `services/`, `types/`.

### Désinformation (`fake-news`)

Pipeline **Agentic RAG** orchestré par `analysis.service.ts` :

1. **Extraction des affirmations** — `claim.service.ts` isole les affirmations vérifiables.
2. **Génération de requêtes** — `query.service.ts` produit les requêtes de recherche.
3. **Recherche de preuves** — `search.provider.ts` / `search.service.ts` interroge le web.
4. **Recherche de fact-checks** — `factcheck.service.ts` cherche des vérifications existantes.
5. **Pondération des sources** — `credibility.service.ts` évalue la fiabilité des sources.
6. **Synthèse & verdict** — `synthesis.service.ts` + `verification.service.ts` + `scoring.service.ts` produisent un verdict (`SUPPORTS`, `REFUTED`, `NOT_ENOUGH_INFO`, `UNCERTAIN`) et un score global.

### Arnaques (`scams`)

Analyse à trois volets fusionnés par `scam.service.ts` :

- `scam-url.service.ts` — signaux issus de l'URL et du domaine ;
- `scam-content.service.ts` — motifs textuels (promesses, urgence, gains) ;
- `scam-identity.service.ts` — indices d'usurpation d'identité ;
- `scam-scoring.service.ts` — agrégation en un score et un verdict.

### Toxicité (`toxicity`)

Combine deux sources :

- `toxicity-pattern.service.ts` — détection par motifs/règles ;
- `toxicity-ai.service.ts` + `toxicity-model.service.ts` — modèle ONNX (`toxic_detector.onnx`) sur 9 catégories (`INSULT`, `HARASSMENT`, `THREAT`, `HATE`, `SEXUAL_HARASSMENT`, `AGGRESSION`, `BULLYING`, `PROVOCATION`, `OTHER`).

`toxicity-normalization.service.ts` et `toxicity-scoring.service.ts` normalisent et agrègent les signaux.

### Rabbit Hole (`rabbit-hole`)

- `feature-extraction.service.ts` — calcule 6 features (longueur de séquence, profondeur de clics, temps de session, vidéos uniques, score de répétition, score de diversité) ;
- `rabbit-hole-model.service.ts` — modèle ONNX (`rabbit_hole_model.onnx`) qui prédit `LOW` / `MEDIUM` / `HIGH` ;
- `content-chain.service.ts`, `recommendation.service.ts` — chaîne de contenus et recommandations.

### Couche ML partagée (`shared/ml`)

- `onnx/onnx-runner.ts` — exécution commune des modèles ONNX (entrées texte ou vecteur) ;
- `malagasy/index.ts` — routeur de langue (`fr` / `en` / `mg` / `unknown`) et services de sentiment malgaches (`malagasy_plugin.onnx`, `malagasy_sentiment_model.onnx`, `malagasy_sentiment_classifier.onnx`).

---

## Pipeline Python (fake news — Agentic RAG)

`backend/src/modules/fake-news/fake-news-main/` contient une implémentation Python de référence du pipeline de détection de désinformation, suivant les mêmes 5 étapes :

| Fichier | Étape |
|---|---|
| `claim_extraction.py` | 1. Extraction des affirmations |
| `query_generation.py` | 2. Génération de requêtes |
| `web_search.py` | 3. Recherche web live (Tavily) |
| `credibility.py` | 4. Filtrage / pondération des sources |
| `synthesis.py` | 5. Synthèse & score de véracité (LLM) |
| `pipeline.py` | Orchestrateur des étapes 1 → 5 |
| `main.py` | Point d'entrée CLI |

Utilisation en ligne de commande :

```bash
python main.py "Le gouvernement a annoncé l'augmentation de 20% des taxes dès demain."
python main.py --file exemple.txt
```

Prérequis LLM local :

```bash
# Ollama (par défaut)
ollama pull mistral
ollama serve
```

> Cette implémentation Python est une référence/CLI. Le backend TypeScript réimplémente la même logique pour l'exposer à l'extension.

---

## Scripts disponibles

| Script | Commande | Description |
|---|---|---|
| `dev` | `wxt` | Extension en dev (Chrome) |
| `dev:firefox` | `wxt -b firefox` | Extension en dev (Firefox) |
| `build` | `wxt build` | Build production (Chrome) |
| `build:firefox` | `wxt build -b firefox` | Build production (Firefox) |
| `zip` | `wxt zip` | Archive de distribution |
| `compile` | `tsc --noEmit` | Vérification des types |
| `backend:start` | `tsx backend/src/server.ts` | Lance le backend |
| `backend:dev` | `tsx watch backend/src/server.ts` | Backend avec rechargement à chaud |

---

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| « Le backend est indisponible » | Backend non démarré | Lancer `npm run backend:dev` |
| « L'analyse backend est indisponible » | Backend injoignable ou timeout (15 s) | Vérifier `VITE_API_BASE_URL` et les logs backend |
| « Le script d'extraction n'est pas disponible » | Content script non injecté sur la page | Recharger l'onglet ; éviter les pages spéciales du navigateur |
| « Cette page ne permet pas l'extraction » | URL non `http(s)` (page interne, `chrome://`…) | Utiliser une page web normale |
| Module marqué en erreur mais analyse OK | Un module a échoué, les autres ont répondu | L'analyse passe en `partial` — consulter les logs du module |
| Erreurs LLM dans le pipeline Python | Ollama/LM Studio non lancé ou clé Tavily absente | Démarrer le serveur LLM, renseigner `TAVILY_API_KEY`, activer `DEBUG_LLM=1` |

**Logs** : l'extension trace chaque étape via des logs préfixés `[SafePlace][…]` (par ex. `[SafePlace][SidePanel][STATE][SP-…]`). Ils apparaissent dans la console du side panel et dans la console du service worker. Le flag `SAFEPLACE_DEBUG` dans le code contrôle leur verbosité.
