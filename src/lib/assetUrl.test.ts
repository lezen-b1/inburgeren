import { describe, expect, it } from 'vitest';
import { pdfReaderHref, publicAssetUrl } from './assetUrl';

describe('public asset URLs', () => {
  it('resolves bundled PDFs against the Vite base path', () => {
    expect(publicAssetUrl('./sources/exam-2025-complete.pdf', '/inburgeren/')).toBe('/inburgeren/sources/exam-2025-complete.pdf');
  });

  it('keeps absolute URLs unchanged', () => {
    expect(publicAssetUrl('https://example.test/file.pdf')).toBe('https://example.test/file.pdf');
  });

  it('opens PDFs through the dedicated HashRouter reader', () => {
    const href = pdfReaderHref('./sources/exam-2024.pdf', {
      page: 7,
      title: 'Openbaar examen 2024',
      baseUrl: '/inburgeren/',
    });
    expect(href).toBe('/inburgeren/#/pdf?src=.%2Fsources%2Fexam-2024.pdf&page=7&title=Openbaar+examen+2024');
  });

  it('normalizes invalid reader page numbers to page one', () => {
    expect(pdfReaderHref('./sources/exam-2020.pdf', { page: 0, baseUrl: '/inburgeren' }))
      .toBe('/inburgeren/#/pdf?src=.%2Fsources%2Fexam-2020.pdf&page=1');
  });
});
