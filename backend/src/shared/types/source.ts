export type SourceKind = "OFFICIAL" | "NEWS" | "FACT_CHECK" | "SCIENTIFIC" | "REFERENCE" | "OTHER";

export interface SourceReference {
  url: string;
  title: string;
  sourceName: string;
  kind: SourceKind;
}
