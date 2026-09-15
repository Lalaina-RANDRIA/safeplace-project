import type { ExtractionPayload } from './extraction';
import type { AnalysisResponse } from './analysis';
import type { UIAnalysisResult } from '../entrypoints/sidepanel/types/ui';

export type VerificationResult = ExtractionPayload;

export type AnalysisScreen =
  | 'idle'
  | 'ready'
  | 'extracting'
  | 'analyzing'
  | 'result'
  | 'partial_result'
  | 'error'
  | 'unsupported_page'
  | 'insufficient_context';

export type Screen =
  | { status: Extract<AnalysisScreen, 'idle' | 'ready' | 'extracting'> }
  | { status: Extract<AnalysisScreen, 'analyzing'>; data: VerificationResult; ui: UIAnalysisResult }
  | { status: Extract<AnalysisScreen, 'result' | 'partial_result'>; data: VerificationResult; analysis: AnalysisResponse; ui: UIAnalysisResult }
  | { status: Extract<AnalysisScreen, 'error' | 'unsupported_page' | 'insufficient_context'>; message: string };