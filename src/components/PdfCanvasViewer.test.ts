import { describe, expect, it } from 'vitest';
import { isPdfRenderCancellation, toSafePdfPage } from './PdfCanvasViewer.utils';
import { PDF_WORKER_URL } from './PdfCanvasViewer.worker';

describe('PdfCanvasViewer helpers', () => {
  it('uses page 1 by default for invalid requested pages', () => {
    expect(toSafePdfPage(Number.NaN, 12)).toBe(1);
    expect(toSafePdfPage(0, 12)).toBe(1);
    expect(toSafePdfPage(-3, 12)).toBe(1);
  });

  it('clamps requested pages to the document page count', () => {
    expect(toSafePdfPage(3, 12)).toBe(3);
    expect(toSafePdfPage(30, 12)).toBe(12);
    expect(toSafePdfPage(2, 0)).toBe(1);
  });

  it('detects PDF.js render cancellation without treating it as a real failure', () => {
    expect(isPdfRenderCancellation({ name: 'RenderingCancelledException' })).toBe(true);
    expect(isPdfRenderCancellation(new Error('network'))).toBe(false);
    expect(isPdfRenderCancellation(null)).toBe(false);
  });

  it('uses a Vite-managed local worker url instead of a CDN or file url', () => {
    expect(PDF_WORKER_URL).toContain('pdf.worker.min.mjs');
    expect(PDF_WORKER_URL).not.toMatch(/^https?:\/\//);
    expect(PDF_WORKER_URL).not.toMatch(/^file:\/\//);
  });
});
