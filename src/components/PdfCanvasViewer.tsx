import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, FileText, RefreshCw } from 'lucide-react';
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
import { useI18n } from '../lib/i18n';

GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;

interface PdfCanvasViewerProps {
  src?: string;
  url?: string;
  page?: number;
  initialPage?: number;
  title: string;
  compact?: boolean;
  preferCanvas?: boolean;
}

interface PdfError {
  title: string;
  detail: string;
}

function toPdfError(error: unknown, t: (key: string) => string): PdfError {
  if (isPdfRenderCancellation(error)) {
    return {
      title: t('pdfStoppedTitle'),
      detail: t('pdfStoppedDetail'),
    };
  }

  const message = error instanceof Error ? error.message : '';
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('worker')) {
    return {
      title: t('pdfWorkerTitle'),
      detail: t('pdfWorkerDetail'),
    };
  }

  if (lowerMessage.includes('missing') || lowerMessage.includes('404') || lowerMessage.includes('not found')) {
    return {
      title: t('pdfMissingTitle'),
      detail: t('pdfMissingDetail'),
    };
  }

  if (lowerMessage.includes('invalid') || lowerMessage.includes('corrupt') || lowerMessage.includes('pdf')) {
    return {
      title: t('pdfInvalidTitle'),
      detail: t('pdfInvalidDetail'),
    };
  }

  return {
    title: t('pdfGenericTitle'),
    detail: t('pdfGenericDetail'),
  };
}

export function PdfCanvasViewer({ src, url, page, initialPage, title, compact = false, preferCanvas = false }: PdfCanvasViewerProps) {
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<'native' | 'canvas'>(preferCanvas ? 'canvas' : 'native');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(preferCanvas ? 'loading' : 'ready');
  const [error, setError] = useState<PdfError | null>(null);
  const [visiblePage, setVisiblePage] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const pdfUrl = src ?? url ?? '';
  const requestedPage = page ?? initialPage ?? 1;
  const nativeUrl = `${pdfUrl}#page=${Math.max(1, requestedPage)}&view=FitH`;

  useEffect(() => {
    if (mode !== 'canvas') {
      setStatus('ready');
      setError(null);
      return undefined;
    }

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
          throw new Error(t('pdfCanvasContext'));
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
          setError(toPdfError(renderError, t));
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
  }, [compact, mode, pdfUrl, requestedPage, retryKey]);

  return (
    <div className={`pdf-canvas-viewer${compact ? ' pdf-canvas-viewer--compact' : ''}`}>
      <div className="pdf-canvas-viewer__toolbar">
        <button className={`pdf-mode-button${mode === 'native' ? ' is-active' : ''}`} type="button" onClick={() => setMode('native')}>
          <FileText size={16} />
          {t('originalPdf')}
        </button>
        <button className={`pdf-mode-button${mode === 'canvas' ? ' is-active' : ''}`} type="button" onClick={() => setMode('canvas')}>
          <RefreshCw size={16} />
          {t('alternateView')}
        </button>
      </div>
      <div className="pdf-canvas-viewer__stage" aria-busy={status === 'loading'}>
        {mode === 'native' ? (
          <object data={nativeUrl} type="application/pdf" title={title} className="pdf-native-object">
            <iframe src={nativeUrl} title={title} className="pdf-native-object" />
          </object>
        ) : (
          <canvas ref={canvasRef} title={title} aria-label={`${title} - صفحة ${visiblePage}`} />
        )}

        {mode === 'canvas' && status === 'loading' ? (
          <div className="pdf-canvas-viewer__state">
            <RefreshCw size={20} />
            <span>{t('loadingPdf')}</span>
          </div>
        ) : null}

        {mode === 'canvas' && status === 'error' && error ? (
          <div className="pdf-canvas-viewer__state pdf-canvas-viewer__state--error">
            <AlertTriangle size={22} />
            <strong>{error.title}</strong>
            <p>{error.detail}</p>
            <button type="button" className="button button--primary" onClick={() => setRetryKey((value) => value + 1)}>
              <RefreshCw size={16} />
              {t('retry')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
