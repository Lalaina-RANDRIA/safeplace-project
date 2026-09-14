export interface ExtractedLink {
  href: string;
  text: string;
}

export interface ExtractionPayload {
  url: string;
  domain: string;
  title: string;
  text: string;
  extractionMethod: 'readability' | 'selector-fallback' | 'none';
  links: ExtractedLink[];
  extractedAt: number;
}

export interface StartExtractionMessage {
  type: 'START_EXTRACTION';
}

export interface ExtractionResultMessage {
  type: 'EXTRACTION_RESULT';
  payload: ExtractionPayload;
}

export interface ExtractionResultForPanelMessage {
  type: 'EXTRACTION_RESULT_FOR_PANEL';
  payload: ExtractionPayload;
}

export type ExtractionErrorCode =
  | 'NO_ACTIVE_TAB'
  | 'UNSUPPORTED_PAGE'
  | 'CONTENT_SCRIPT_UNAVAILABLE'
  | 'EXTRACTION_FAILED'
  | 'INVALID_EXTRACTION_RESULT';

export interface ExtractionErrorMessage {
  type: 'EXTRACTION_ERROR';
  code: ExtractionErrorCode;
  message: string;
}

export type ExtensionMessage =
  | StartExtractionMessage
  | ExtractionResultMessage
  | ExtractionResultForPanelMessage
  | ExtractionErrorMessage;