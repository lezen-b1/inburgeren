import { ArrowLeft, ArrowRight, Download, FileWarning, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PdfCanvasViewer } from '../components/PdfCanvasViewer';
import { publicAssetUrl } from '../lib/assetUrl';
import { sourceDocuments } from '../lib/exams';
import { usePageMeta } from '../lib/pageMeta';

function toPositiveInt(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function PdfViewerPage() {
  const [params, setParams] = useSearchParams();
  const documentId = params.get('document') ?? '';
  const legacySrc = params.get('src') ?? '';
  const legacyTitle = params.get('title') ?? '';
  const page = toPositiveInt(params.get('page'));
  const doc = sourceDocuments.find((item) => item.id === documentId)
    ?? sourceDocuments.find((item) => legacySrc && item.sourceUrl === legacySrc);
  const removedReadingGuide = legacySrc.includes('reading-techniques.pdf') || documentId === 'reading-techniques';
  const pdfTitle = doc?.title ?? legacyTitle.trim() ?? 'PDF';
  const pdfUrl = doc ? publicAssetUrl(doc.sourceUrl) : legacySrc && !removedReadingGuide ? publicAssetUrl(legacySrc) : '';
  usePageMeta(doc ? `PDF — ${doc.title}` : 'عارض PDF');

  if (!pdfUrl) {
    return (
      <section className="section shell checkpoint-page">
        <div className="summary-card">
          <span className="summary-icon"><FileWarning /></span>
          <h1>{removedReadingGuide ? 'تم حذف هذا الملف التعليمي' : 'ملف PDF غير موجود'}</h1>
          <p>
            {removedReadingGuide
              ? 'استُبدل الدليل النظري بلعبة العبارات العملية لأنها أقرب لطريقة أسئلة Lezen B1.'
              : 'تحقق من رابط الملف أو افتح صفحة المصادر.'}
          </p>
          <div className="summary-actions">
            <Link className="button button--primary" to="/phrases">فتح لعبة المعنى</Link>
            <Link className="button button--primary" to="/sources">فتح المصادر</Link>
            <Link className="button button--secondary" to="/models">النماذج</Link>
          </div>
        </div>
      </section>
    );
  }

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(Math.max(1, nextPage)));
    setParams(next);
  };

  return (
    <section className="pdf-viewer-page">
      <header className="pdf-viewer-toolbar">
        <div>
          <span className="section-kicker">PDF الأصلي</span>
          <h1>{pdfTitle}</h1>
        </div>
        <div className="pdf-viewer-actions">
          <button className="icon-button" type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} title="الصفحة السابقة"><ArrowRight size={18} /></button>
          <span>صفحة {page}</span>
          <button className="icon-button" type="button" onClick={() => setPage(page + 1)} title="الصفحة التالية"><ArrowLeft size={18} /></button>
          <a className="icon-button" href={pdfUrl} download title="تنزيل PDF"><Download size={18} /><span>تنزيل</span></a>
          <Link className="icon-button" to="/models" title="إغلاق"><X size={18} /><span>إغلاق</span></Link>
        </div>
      </header>
      <div className="pdf-viewer-frame">
        <PdfCanvasViewer src={pdfUrl} page={page} title={pdfTitle} />
        <p className="pdf-page-note">يعرض العارض الصفحة المطلوبة مباشرة داخل الموقع. إذا ظهر خطأ، افتح الملف الأصلي من الأعلى.</p>
      </div>
    </section>
  );
}
