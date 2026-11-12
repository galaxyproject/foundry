/** Shared by the source resolver and the summary resolver. */
export function normalizeGitUrl(url: string): string {
  const scpStyle = /^([^@]+@[^:]+):(.+)$/u.exec(url);
  if (scpStyle) return `ssh://${scpStyle[1]}/${scpStyle[2]}`;
  return url;
}

/** The URL as provenance, or null when it is not a URI (e.g. a local bare-repo path). */
export function remoteSourceUrl(url: string | null): string | null {
  const normalized = url ? normalizeGitUrl(url) : null;
  return normalized && /^[a-z][a-z0-9+.-]*:\/\//iu.test(normalized) ? normalized : null;
}
