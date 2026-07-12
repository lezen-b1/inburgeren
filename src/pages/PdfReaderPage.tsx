import { useEffect, useMemo } from 'react';
import { Download, ExternalLink, FileWarning, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PdfCanvasViewer } from '../components/PdfCanvasViewer';
import { publicAssetUrl } from '../lib/assetUrl';

function readPage(value: string | null): number {
  const parsed = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function PdfReaderPage() {
  const [params] = useSearchParams();
  const source = params.get('src')?.trim() ?? '';
  const title = params.get('title')?.trim() || 'ملف PDF';
  const page = readPage(params.get('page'));
  const pdfUrl = useMemo(() => (source ? publicAssetUrl(source) : ''), [source]);
  const rawPageUrl = pdfUrl ? `${pdfUrl}#page=${page}` : '';

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} — NT2 Lezen B1`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  if (!source) {
    return (
      <section className="section pdf-reader-page">
        <div className="pdf-reader-error" role="alert">
          <FileWarning size={36} />
          <h1>تعذر تحديد ملف PDF</h1>
          <p>الرابط لا يحتوي على مسار ملف صالح.</p>
          <Link className="button button--primary" to="/models">العودة إلى النماذج</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="pdf-reader-page" aria-label={`قراءة ملف PDF: ${title}`}>
      <header className="pdf-reader-page__header">
        <div>
          <span className="section-kicker">قراءة موسعة</span>
          <h1>{title}</h1>
          <p>يُعرض الملف داخل عارض PDF.js مستقل لتجنب الصفحة البيضاء أو العودة إلى الصفحة الرئيسية.</p>
        </div>
        <div className="pdf-reader-page__actions">
          <a className="button button--secondary" href={pdfUrl} download>
            <Download size={17} /> تنزيل PDF
          </a>
          <a className="button button--ghost" href={rawPageUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={17} /> فتح الملف الخام
          </a>
          <button className="button button--ghost" type="button" onClick={() => window.close()}>
            <X size={17} /> إغلاق النافذة
          </button>
        </div>
      </header>

      <div className="pdf-reader-page__viewer">
        <PdfCanvasViewer url={pdfUrl} title={title} initialPage={page} />
      </div>
    </section>
  );
}
