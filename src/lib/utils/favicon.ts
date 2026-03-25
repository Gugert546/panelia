export function normalizeUrl(url: string) {
  const trimmed = url.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export function getOriginFaviconUrl(pageUrl: string) {
  try {
    const { origin } = new URL(pageUrl);
    return `${origin}/favicon.ico`;
  } catch {
    return "";
  }
}

export function getServiceFaviconUrl(pageUrl: string) {
  try {
    const { hostname } = new URL(pageUrl);
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`;
  } catch {
    return "";
  }
}

export function getPreferredFavicon(url: string, fetchedFavicon?: string) {
  const fetched = (fetchedFavicon ?? "").trim();
  if (fetched) return fetched;

  const originFavicon = getOriginFaviconUrl(url);
  if (originFavicon) return originFavicon;

  return getServiceFaviconUrl(url);
}

export function getFaviconCandidates(url: string, savedFavicon?: string) {
  const candidates = [
    (savedFavicon ?? "").trim(),
    getOriginFaviconUrl(url),
    getServiceFaviconUrl(url),
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}
