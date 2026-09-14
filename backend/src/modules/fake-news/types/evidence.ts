/**
 * Position d'une preuve par rapport à une affirmation.
 */
export type EvidenceStance =
    | "SUPPORTS"   // La preuve soutient l'affirmation
    | "REFUTES"    // La preuve contredit l'affirmation
    | "NEUTRAL";   // La preuve apporte du contexte sans confirmer ni contredire


/**
 * Type de source dont provient la preuve.
 */
export type EvidenceSourceType =
    | "OFFICIAL"       // Gouvernement, organisme public, institution officielle
    | "NEWS"           // Média d'information
    | "FACT_CHECK"     // Site spécialisé dans la vérification des faits
    | "SCIENTIFIC"     // Université, publication ou organisme scientifique
    | "REFERENCE"      // Encyclopédie, base documentaire, etc.
    | "SOCIAL_MEDIA"   // Réseau social
    | "BLOG"           // Blog ou site personnel
    | "OTHER";


/**
 * Niveau de fiabilité estimé de la source.
 */
export type SourceReliability =
    | "VERY_HIGH"
    | "HIGH"
    | "MEDIUM"
    | "LOW"
    | "UNKNOWN";


/**
 * Une preuve utilisée pour vérifier une affirmation.
 */
export interface Evidence {
    /**
     * Identifiant interne unique de la preuve.
     */
    id: string;

    /**
     * Titre de la page ou de l'article.
     */
    title: string;

    /**
     * URL complète de la source.
     */
    url: string;

    /**
     * Nom de la source.
     * Exemple : "OMS", "BBC", "INSTAT Madagascar".
     */
    sourceName: string;

    /**
     * Type de source.
     */
    sourceType: EvidenceSourceType;

    /**
     * Niveau de fiabilité estimé de la source.
     */
    reliability: SourceReliability;

    /**
     * Date de publication de la source.
     *
     * Peut être undefined si la date n'est pas disponible.
     */
    publishedAt?: string;

    /**
     * Date à laquelle SafePlace a récupéré la preuve.
     */
    retrievedAt: string;

    /**
     * Extrait du contenu qui sert de preuve.
     */
    excerpt?: string;

    /**
     * Position de la preuve par rapport à l'affirmation.
     */
    stance: EvidenceStance;

    /**
     * Score de pertinence de la preuve.
     *
     * Valeur comprise entre 0 et 1.
     *
     * 1.0 = très pertinente
     * 0.0 = pas pertinente
     */
    relevanceScore: number;

    /**
     * Score de confiance accordé à cette preuve.
     *
     * Valeur comprise entre 0 et 1.
     */
    confidenceScore: number;
}


/**
 * Collection de preuves utilisées pour une affirmation.
 */
export interface EvidenceSet {
    /**
     * Identifiant de l'affirmation vérifiée.
     */
    claimId: string;

    /**
     * Liste des preuves trouvées.
     */
    evidence: Evidence[];

    /**
     * Nombre total de preuves.
     */
    totalEvidence: number;

    /**
     * Nombre de preuves soutenant l'affirmation.
     */
    supportingEvidence: number;

    /**
     * Nombre de preuves contredisant l'affirmation.
     */
    contradictingEvidence: number;

    /**
     * Nombre de preuves neutres.
     */
    neutralEvidence: number;
}


/**
 * Paramètres utilisés pour rechercher les preuves.
 */
export interface EvidenceSearchQuery {
    /**
     * Affirmation à vérifier.
     */
    claim: string;

    /**
     * Langue souhaitée pour les résultats.
     *
     * Exemple :
     * "fr"
     * "en"
     * "mg"
     */
    language?: string;

    /**
     * Nombre maximum de résultats souhaités.
     */
    maxResults?: number;

    /**
     * Types de sources privilégiés.
     */
    preferredSourceTypes?: EvidenceSourceType[];

    /**
     * Domaines à privilégier.
     *
     * Exemple :
     * ["gov.mg", "who.int"]
     */
    preferredDomains?: string[];
}


/**
 * Résultat brut d'une recherche de preuves.
 */
export interface EvidenceSearchResult {
    /**
     * Requête utilisée pour la recherche.
     */
    query: EvidenceSearchQuery;

    /**
     * Preuves trouvées.
     */
    evidence: Evidence[];

    /**
     * Temps nécessaire à la recherche, en millisecondes.
     */
    processingTimeMs?: number;
}