export function parseHttpUrl(value: string): URL | undefined {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

export function getRegistrableDomain(url: URL): string {
  const labels = url.hostname.split(".");
  return labels.length > 2 ? labels.slice(-2).join(".") : url.hostname;
}
