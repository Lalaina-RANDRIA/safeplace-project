import type { ExtractionPayload } from './extraction';
import type { AnalysisResponse } from './analysis';

export type VerificationResult = ExtractionPayload;

export type Screen =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; data: VerificationResult; analysis?: AnalysisResponse }
  | { status: 'error'; message: string };