import type { ExtractionPayload } from './extraction';

export type VerificationResult = ExtractionPayload;

export type Screen =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'result'; data: VerificationResult }
  | { status: 'error'; message: string };