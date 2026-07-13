import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react';
import {
  GlobalWorkerOptions,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
  type PDFPageProxy,
  type RenderTask,
} from 'pdfjs-dist';
import { isPdfRenderCancellation, toSafePdfPage } from './PdfCanvasViewer.utils';
import { PDF_WORKER_URL } from './PdfCanvasViewer.worker';

GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

interface PdfCanvasViewerProps {
  src?: string;
  url?: string;
  page?: number;
  initialPage?: number;
  title: string;
  compact?: boolean;
}

interface PdfError {
  title: string;
  detail: string;
}

function toPdfError(error: unknown): PdfError {
  if (isPdfRenderCancellation(error)) {
    return {
      title: 'تم إيقاف العرض السابق',
      detail: 'جار تحديث الصفحة، حاول مرة أخرى إذا لم يظهر الملف.',
    };
  }

  const message = error instanceof Error ? error.message : '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('worker')) {
    return {
      title: 'تعذر تشغيل عارض PDF',
      detail: 'تعذر تحميل عامل PDF المحلي. افتح الملف الأصلي أو أعد المحاولة.',
    };
  }

  if (lowerMessage.includes('missing') || lowerMessage.includes('404') || lowerMessage.includes('not found')) {
    return {
      title: 'ملف PDF غير موجود',
      detail: 'الرابط لا يعيد ملف PDF صالحًا. افتح الملف الأصلي أو تحقق من وجوده داخل sources.',
    };
  }

  if (lowerMessage.includes('invalid') || lowerMessage.includes('corrupt') || lowerMessage.includes('pdf')) {
    return {
      title: 'تعذر قراءة ملف PDF',
      detail: 'قد يكون الملف تالفًا أو أن الاستجابة ليست PDF. جرّب فتح الملف الأصلي.',
    };
  }

  return {
    title: 'تعذر عرض PDF',
    detail: 'حدث خطأ أثناء تحميل أو رسم الصفحة. أعد المحاولة أو افتح الملف الأصلي.',
  };
}

export function PdfCanvasViewer({ src, url, page, initialPage, title, compact = false }: PdfCanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<PdfError | null>(null);
  const [visiblePage, setVisiblePage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const pdfUrl = src ?? url ?? '';
  const requestedPage = page ?? initialPage ?? 1;

  useEffect(() => {
    let cancelled = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    let pdfDocument: PDFDocumentProxy | null = null;
    let renderTask: RenderTask | null = null;

    async function renderPdfPage() {
      const canvas = canvasRef.current;
      if (!canvas) {
        return;
      }

      try {
        setStatus('loading');
        setError(null);

        loadingTask = getDocument({ url: pdfUrl });
        const pdf: PDFDocumentProxy = await loadingTask.promise;
        pdfDocument = pdf;

        const safePage = toSafePdfPage(requestedPage, pdf.numPages);
        const pdfPage: PDFPageProxy = await pdf.getPage(safePage);
        const viewport = pdfPage.getViewport({ scale: compact ? 1.15 : 1.45 });
        const context = canvas.getContext('2d');

        if (!context) {
          throw new Error('تعذر إنشاء سياق Canvas لعرض PDF.');
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`;

        renderTask = pdfPage.render({
          canvas: null,
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;

        if (!cancelled) {
          setVisiblePage(safePage);
          setStatus('ready');
        }
      } catch (renderError) {
        if (cancelled || isPdfRenderCancellation(renderError)) {
          return;
        }

        if (!cancelled) {
          setError(toPdfError(renderError));
          setStatus('error');
        }
      }
    }

    void renderPdfPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      void loadingTask?.destroy();
      void pdfDocument?.cleanup();
    };
  }, [compact, pdfUrl, requestedPage, retryKey]);

  return (
    <div className={`pdf-canvas-viewer${compact ? ' pdf-canvas-viewer--compact' : ''}`}>
      <div className="pdf-canvas-viewer__stage" aria-busy={status === 'loading'}>
        <canvas ref={canvasRef} title={title} aria-label={`${title} - صفحة ${visiblePage}`} />

        {status === 'loading' ? (
          <div className="pdf-canvas-viewer__state">
            <RefreshCw size={20} />
            <span>جار تحميل PDF...</span>
          </div>
        ) : null}

        {status === 'error' && error ? (
          <div className="pdf-canvas-viewer__state pdf-canvas-viewer__state--error">
            <AlertTriangle size={22} />
            <strong>{error.title}</strong>
            <p>{error.detail}</p>
            <div className="pdf-canvas-viewer__actions">
              <button type="button" className="button button--primary" onClick={() => setRetryKey((value) => value + 1)}>
                <RefreshCw size={16} />
                إعادة المحاولة
              </button>
              <a className="button button--secondary" href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={16} />
                فتح الملف الأصلي
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
