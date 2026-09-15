"""
Index de crédibilité des domaines, séparé par langue.

C'est le seul fichier à éditer pour ajouter/retirer une source de confiance
(étape 4 du plan : "Filtrage des Sources").

Les poids reprennent directement ton plan :
    Institutionnel / média certifié   -> 1.0
    Presse régionale/locale reconnue  -> 0.8
    Blog / réseau social non vérifié  -> 0.2 (poids par défaut, cf credibility.py)
"""

# Sites de fact-checking et médias de référence en français.
TRUSTED_DOMAINS_FR: dict[str, float] = {
    "factuel.afp.com": 1.0,
    "lemonde.fr": 1.0,          # inclut la rubrique "Les Décodeurs"
    "liberation.fr": 1.0,       # CheckNews
    "francetvinfo.fr": 1.0,     # VraiOuFake
    "franceinfo.fr": 1.0,
    "20minutes.fr": 0.8,
    "lefigaro.fr": 0.8,
    "lepoint.fr": 0.8,
}

# Presse et portails d'actualité malgaches reconnus.
TRUSTED_DOMAINS_MG: dict[str, float] = {
    "2424.mg": 0.9,
    "midi-madagasikara.mg": 0.9,
    "lexpress.mg": 0.9,
    "newsmada.com": 0.8,
    "moov.mg": 0.7,
    "orange.mg": 0.7,
}

# Pages Facebook officielles des mêmes médias malgaches reconnus ci-dessus.
# Beaucoup d'utilisateurs à Madagascar suivent l'actualité via Facebook
# plutôt que via les sites web directement, et Tavily renvoie parfois des
# posts Facebook publics dans ses résultats. Sans cette liste, ces liens
# tomberaient dans DEFAULT_UNKNOWN_DOMAIN_WEIGHT (0.2, comme un post
# lambda) alors qu'il s'agit de la même rédaction que le site web.
#
# La clé est le "slug" qui suit facebook.com/ dans l'URL de la page
# officielle (ex : facebook.com/2424mg -> clé "2424mg").
# Le poids reprend celui du domaine web correspondant dans TRUSTED_DOMAINS_MG.
#
# IMPORTANT : Tavily ne peut indexer que des posts Facebook PUBLICS déjà
# accessibles sans connexion — ça ne couvre pas tout le contenu de ces
# pages, seulement ce qui a été indexé par le moteur de recherche.
TRUSTED_FACEBOOK_PAGES_MG: dict[str, float] = {
    "2424mg": 0.9,
    "MidiMadagasikara": 0.9,
    "lexpressmada": 0.9,
    "newsmada": 0.8,
}

# Mots-clés ajoutés aux requêtes de recherche en français pour prioriser
# les résultats de fact-checking (étape 2).
FR_FACT_CHECK_KEYWORDS = ["fact check", "désintox", "vrai ou faux"]

# Poids appliqué à un domaine qui n'apparaît dans aucune des listes
# ci-dessus (blogs, comptes/pages non identifiés, réseaux sociaux hors
# TRUSTED_FACEBOOK_PAGES_MG).
DEFAULT_UNKNOWN_DOMAIN_WEIGHT = 0.2
