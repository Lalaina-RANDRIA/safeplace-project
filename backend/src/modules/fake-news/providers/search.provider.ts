export interface SearchProviderResult {
  title: string;
  url: string;
  content?: string;
}

export interface SearchProvider {
  search(query: string): Promise<SearchProviderResult[]>;
}

export class UnavailableSearchProvider implements SearchProvider {
  async search(_query: string): Promise<SearchProviderResult[]> {
    return [];
  }
}
