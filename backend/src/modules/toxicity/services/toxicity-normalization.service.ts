export class ToxicityNormalizationService {
  normalize(text: string): string {
    return text.normalize("NFC").replace(/\s+/g, " ").trim();
  }
}

export const toxicityNormalizationService = new ToxicityNormalizationService();
