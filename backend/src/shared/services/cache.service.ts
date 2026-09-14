export class CacheService<T> {
  private readonly values = new Map<string, T>();
  get(key: string): T | undefined { return this.values.get(key); }
  set(key: string, value: T): void { this.values.set(key, value); }
  delete(key: string): void { this.values.delete(key); }
  clear(): void { this.values.clear(); }
}
