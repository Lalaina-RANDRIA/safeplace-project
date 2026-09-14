import type { Evidence as SharedEvidence } from "./evidence";

// types/analysis.ts

/**
 * Verdict final attribué à une affirmation ou à une analyse globale.
 */
export type Verdict =
    | "SUPPORTED"        // Les preuves disponibles soutiennent l'affirmation
    | "REFUTED"          // Les preuves disponibles contredisent l'affirmation
    | "NOT_ENOUGH_INFO"  // Les preuves sont insuffisantes
    | "UNCERTAIN";       // Les résultats sont contradictoires ou ambigus


/**
 * Position d'une source par rapport à une affirmation.
 */
export type EvidenceStance =
    | "SUPPORTS"         // La source soutient l'affirmation
    | "REFUTES"          // La source contredit l'affirmation
    | "NEUTRAL";         // La source donne du contexte sans prendre position


/**
 * Type de source utilisée pour vérifier une information.
 */
export type EvidenceSourceType =
    | "OFFICIAL"         // Gouvernement, institution, organisme officiel...
    | "NEWS"             // Média d'information
    | "FACT_CHECK"       // Site spécialisé dans le fact-checking
    | "SCIENTIFIC"       // Article scientifique, université, organisme scientifique
    | "REFERENCE"        // Encyclopédie, base documentaire, etc.
    | "OTHER";


/**
 * Une preuve trouvée sur Internet pour vérifier une affirmation.
 */
export interface Evidence {
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
     * Exemple : "OMS", "BBC", "Gouvernement Malagasy".
     */
    source: string;

    /**
     * Type de source.
     */
    sourceType: EvidenceSourceType;

    /**
     * Date de publication de la source, si disponible.
     */
    date?: string;

    /**
     * Score de pertinence de la preuve.
     *
     * Valeur comprise entre 0 et 1.
     *
     * Exemple :
     * 0.95 = très pertinente
     * 0.50 = moyennement pertinente
     * 0.10 = peu pertinente
     */
    relevanceScore: number;

    /**
     * Position de la source par rapport à l'affirmation.
     */
    stance: EvidenceStance;

    /**
     * Résumé du passage pertinent trouvé dans la source.
     */
    excerpt?: string;
}


/**
 * Une affirmation détectée dans le contenu analysé.
 */
export interface Claim {
    /** Identifiant interne unique de l'affirmation. */
    id: string;

    /**
     * Texte exact de l'affirmation.
     */
    text: string;

    /**
     * Importance de l'affirmation dans l'article.
     *
     * Valeur comprise entre 0 et 1.
     */
    importance: number;

    /**
     * Indique si l'affirmation peut être vérifiée
     * à partir de sources externes.
     */
    checkable: boolean;
}


/**
 * Résultat de vérification d'une affirmation.
 */
export interface ClaimAnalysis {
    /**
     * Affirmation analysée.
     */
    claim: Claim;

    /**
     * Verdict attribué par le système.
     */
    verdict: Verdict;

    /**
     * Niveau de confiance du système.
     *
     * Valeur comprise entre 0 et 1.
     */
    confidence: number;

    /**
     * Explication lisible par l'utilisateur.
     */
    explanation: string;

    /**
     * Sources utilisées pour déterminer le verdict.
     */
    evidence: SharedEvidence[];
}


/**
 * Résultat complet de l'analyse d'une page web.
 */
export interface AnalysisResult {
    /**
     * URL de la page analysée.
     */
    url: string;

    /**
     * Titre de la page.
     */
    title: string;

    /**
     * Nombre total d'affirmations détectées.
     */
    totalClaims: number;

    /**
     * Résultats détaillés pour chaque affirmation.
     */
    claims: ClaimAnalysis[];

    /**
     * Score global de crédibilité.
     *
     * Valeur comprise entre 0 et 1.
     */
    overallScore: number;

    /**
     * Verdict global de la page.
     */
    overallVerdict: Verdict;

    /**
     * Date et heure de l'analyse.
     */
    analyzedAt: string;
}