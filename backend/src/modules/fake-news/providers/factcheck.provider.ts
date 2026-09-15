export interface FactCheckProvider {
  search(claim: string): Promise<unknown[]>;
}

export class UnavailableFactCheckProvider implements FactCheckProvider {
  async search(_claim: string): Promise<unknown[]> {
    return [];
  }
}
