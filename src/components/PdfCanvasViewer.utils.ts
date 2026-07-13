export function toSafePdfPage(requestedPage: number, totalPages: number) {
  const fallbackPage = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const safeTotal = Number.isInteger(totalPages) && totalPages > 0 ? totalPages : 1;
  return Math.min(Math.max(1, fallbackPage), safeTotal);
}

export function isPdfRenderCancellation(error: unknown) {
  return Boolean(
    error
      && typeof error === 'object'
      && 'name' in error
      && (error as { name?: string }).name === 'RenderingCancelledException',
  );
}
