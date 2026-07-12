export function publicAssetUrl(sourceUrl: string, baseUrl = import.meta.env.BASE_URL || '/'): string {
  if (/^(https?:|data:|blob:)/i.test(sourceUrl)) return sourceUrl;
  if (sourceUrl.startsWith('/')) return sourceUrl;
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedSource = sourceUrl.replace(/^\.\//, '');
  return `${normalizedBase}${normalizedSource}`;
}

interface PdfReaderHrefOptions {
  page?: number | null;
  title?: string;
  baseUrl?: string;
}

/**
 * Builds a HashRouter URL for the dedicated PDF.js reader.
 * Opening PDFs through the app route avoids browser plug-in inconsistencies
 * and prevents the PWA navigation fallback from returning the home page.
 */
export function pdfReaderHref(sourceUrl: string, options: PdfReaderHrefOptions = {}): string {
  const baseUrl = options.baseUrl ?? import.meta.env.BASE_URL ?? '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const page = Math.max(1, Math.trunc(options.page ?? 1));
  const params = new URLSearchParams({
    src: sourceUrl,
    page: String(page),
  });
  if (options.title?.trim()) params.set('title', options.title.trim());
  return `${normalizedBase}#/pdf?${params.toString()}`;
}
