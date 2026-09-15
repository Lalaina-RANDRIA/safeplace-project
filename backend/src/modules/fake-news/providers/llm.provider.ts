export interface LlmProvider {
  generateStructured<T>(prompt: string, schema: unknown): Promise<T>;
}

export class UnavailableLlmProvider implements LlmProvider {
  async generateStructured<T>(_prompt: string, _schema: unknown): Promise<T> {
    throw new Error("LLM provider unavailable");
  }
}
