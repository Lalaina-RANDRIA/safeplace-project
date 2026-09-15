"""
Point d'entrée pour tester le pipeline en ligne de commande, avant de le
brancher sur l'extension (étape 6 / overlay, gérée côté JS).

Usage :
    python main.py "Le texte de la page web à analyser..."
    python main.py --file exemple.txt
"""

import argparse
import json
import sys

from dotenv import load_dotenv

# Doit être appelé AVANT d'importer pipeline : les modules du pipeline
# (llm_client.py, web_search.py...) lisent les variables d'environnement
# (TAVILY_API_KEY, DEBUG_LLM, etc.) dès leur import, pas seulement à
# l'exécution. Si load_dotenv() arrive après, ces valeurs par défaut sont
# déjà figées et le contenu de .env est silencieusement ignoré.
load_dotenv()

from pipeline import run_pipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Pipeline de détection de fake news")
    parser.add_argument("text", nargs="?", help="Texte à analyser (FR ou MG)")
    parser.add_argument("--file", help="Chemin vers un fichier texte à analyser")
    args = parser.parse_args()

    if args.file:
        with open(args.file, encoding="utf-8") as f:
            page_text = f.read()
    elif args.text:
        page_text = args.text
    else:
        parser.print_help()
        sys.exit(1)

    claim_verdicts = run_pipeline(page_text)

    if not claim_verdicts:
        print("Aucune affirmation vérifiable détectée dans ce texte.")
        return

    output = []
    for cv in claim_verdicts:
        output.append(
            {
                "claim": cv.claim.text,
                "language": cv.claim.language,
                "status": cv.verdict.status,
                "confidence": cv.verdict.confidence,
                "justification": cv.verdict.justification,
                "sources": cv.verdict.sources,
            }
        )

    print(json.dumps(output, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()