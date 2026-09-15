import type { AnalysisResult, ClaimAnalysis, Claim } from "../types/analysis";

import type { Evidence } from "../types/evidence";

import { claimService } from "./claim.service";

import { searchService } from "./search.service";

import { factcheckService } from "./factcheck.service";

import { verificationService } from "./verification.service";

import { scoringService } from "./scoring.service";
import { queryService } from "./query.service";
import { credibilityService } from "./credibility.service";
import { synthesisService } from "./synthesis.service";
import { DEFAULT_AGENTIC_LIMITS } from "../types/provider";

/**
 * Données nécessaires pour analyser une page.
 */
export interface AnalysisInput {
  url: string;
  title: string;
  content: string;
}

/**
 * Service principal d'analyse.
 *
 * Ce service ne réalise pas lui-même toutes les opérations.
 * Il coordonne les différents services spécialisés.
 */
export class AnalysisService {
  /**
   * Analyse complète d'une page web.
   */
  async analyzePage(input: AnalysisInput): Promise<AnalysisResult> {
    /*
     * ============================================================
     * ÉTAPE 1 : EXTRACTION DES AFFIRMATIONS
     * ============================================================
     *
     * On envoie le contenu de la page au ClaimService.
     *
     * Exemple :
     *
     * "Le gouvernement a augmenté le prix du carburant de 50 %."
     *
     * devient une affirmation vérifiable.
     */
    const extractedClaims: Claim[] = await claimService.extractClaims(input.content);
    const claims: Claim[] = extractedClaims.slice(0, DEFAULT_AGENTIC_LIMITS.maxClaims);

    /*
     * ============================================================
     * ÉTAPE 2 : RECHERCHE DE PREUVES
     * ============================================================
     *
     * Pour chaque affirmation, on recherche des sources
     * pertinentes sur Internet.
     */
    const searchResults: Map<string, Evidence[]> = new Map();

    for (const claim of claims) {
      const queries = queryService
        .generate(claim)
        .slice(0, DEFAULT_AGENTIC_LIMITS.maxQueriesPerClaim);
      const evidenceGroups: Evidence[][] = [];

      for (const query of queries) {
        try {
          const evidence = await searchService.searchEvidence(query.text, {
            maxResults: DEFAULT_AGENTIC_LIMITS.maxSearchResultsPerQuery,
          });
          evidenceGroups.push(evidence);
        } catch (error) {
          console.error("[FAKE_NEWS] Search provider failed:", error);
        }
      }

      const mergedEvidence = evidenceGroups.flat();
      searchResults.set(claim.text, credibilityService.evaluateAll(mergedEvidence));
    }

    /*
     * ============================================================
     * ÉTAPE 3 : RECHERCHE DE FACT-CHECKS EXISTANTS
     * ============================================================
     *
     * On cherche maintenant si des organismes spécialisés
     * ont déjà vérifié cette affirmation.
     */
    const factCheckResults: Map<string, Evidence[]> = new Map();

    for (const claim of claims) {
      let factChecks: Evidence[] = [];
      try {
        factChecks = await factcheckService.searchFactChecks(claim.text);
      } catch (error) {
        console.error("[FAKE_NEWS] Fact-check provider failed:", error);
      }

      factCheckResults.set(claim.text, factChecks);

      // Le LLM est optionnel; VerificationService conserve l'autorité finale.
      await synthesisService.synthesize(
        claim,
        [...(searchResults.get(claim.text) ?? []), ...factChecks],
      );
    }

    /*
     * ============================================================
     * ÉTAPE 4 : VÉRIFICATION DES AFFIRMATIONS
     * ============================================================
     *
     * On combine :
     *
     * - l'affirmation
     * - les preuves trouvées sur Internet
     * - les fact-checks existants
     *
     * pour déterminer :
     *
     * SUPPORTS
     * REFUTED
     * NOT_ENOUGH_INFO
     * UNCERTAIN
     */
    const claimAnalyses: ClaimAnalysis[] =
      await verificationService.verifyClaims(
        claims,
        searchResults,
        factCheckResults,
      );

    /*
     * ============================================================
     * ÉTAPE 5 : CALCUL DU SCORE GLOBAL
     * ============================================================
     *
     * On prend les résultats individuels et on calcule
     * le résultat global de la page.
     */
    const scoringResult = scoringService.calculateOverallScore(claimAnalyses);

    /*
     * ============================================================
     * ÉTAPE 6 : CONSTRUCTION DU RÉSULTAT FINAL
     * ============================================================
     */
    const result: AnalysisResult = {
      url: input.url,

      title: input.title,

      totalClaims: claims.length,

      claims: claimAnalyses,

      overallScore: scoringResult.score,

      overallVerdict: scoringResult.verdict,

      analyzedAt: new Date().toISOString(),
    };

    /*
     * Le résultat final est renvoyé au controller.
     */
    return result;
  }
}

/**
 * Instance utilisée par le controller.
 */
export const analysisService = new AnalysisService();
