import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, Minus, Plus, RotateCcw } from 'lucide-react';
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type RenderTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfCanvasViewerProps {
  url: string;
  title: string;
  initialPage?: number;
}

const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.2;
const ZOOM_STEP = 0.15;

export function PdfCanvasViewer({ url, title, initialPage = 1 }: PdfCanvasViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(Math.max(1, initialPage));
  const [zoom, setZoom] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageLabel = useMemo(() => {
    if (!document) return `الصفحة ${pageNumber}`;
    return `الصفحة ${pageNumber} من ${document.numPages}`;
  }, [document, pageNumber]);

  useEffect(() => {
    setPageNumber(Math.max(1, initialPage));
  }, [initialPage, url]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateWidth = () => setContainerWidth(Math.max(0, stage.clientWidth));
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadingTask = getDocument({
      url,
      disableAutoFetch: false,
      disableStream: false,
      disableRange: false,
      useWorkerFetch: true,
    });

    setDocument(null);
    setError(null);
    setLoadingProgress(0);

    loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
      if (cancelled) return;
      setLoadingProgress(total > 0 ? Math.round((loaded / total) * 100) : null);
    };

    loadingTask.promise
      .then((pdf) => {
        if (cancelled) return;
        setDocument(pdf);
        setPageNumber((current) => Math.min(Math.max(1, current), pdf.numPages));
        setLoadingProgress(null);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : 'تعذر تحميل ملف PDF.';
        setError(message);
        setLoadingProgress(null);
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      void loadingTask.destroy();
    };
  }, [url]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!document || !canvas || containerWidth <= 0) return;

    let cancelled = false;
    renderTaskRef.current?.cancel();
    setIsRendering(true);
    setError(null);

    document.getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(280, containerWidth - 28);
        const fitScale = availableWidth / baseViewport.width;
        const cssScale = Math.max(0.25, fitScale * zoom);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const renderViewport = page.getViewport({ scale: cssScale * pixelRatio });
        const cssViewport = page.getViewport({ scale: cssScale });
        const context = canvas.getContext('2d', { alpha: false });

        if (!context) throw new Error('تعذر تشغيل عارض PDF في هذا المتصفح.');

        canvas.width = Math.floor(renderViewport.width);
        canvas.height = Math.floor(renderViewport.height);
        canvas.style.width = `${Math.floor(cssViewport.width)}px`;
        canvas.style.height = `${Math.floor(cssViewport.height)}px`;

        const task = page.render({
          canvas,
          canvasContext: context,
          viewport: renderViewport,
          background: '#ffffff',
        });
        renderTaskRef.current = task;
        return task.promise;
      })
      .then(() => {
        if (!cancelled) setIsRendering(false);
      })
      .catch((reason: unknown) => {
        if (cancelled || (reason instanceof Error && reason.name === 'RenderingCancelledException')) return;
        const message = reason instanceof Error ? reason.message : 'تعذر عرض صفحة PDF.';
        setError(message);
        setIsRendering(false);
      });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, [containerWidth, document, pageNumber, zoom]);

  const goToPage = (nextPage: number) => {
    if (!document) return;
    setPageNumber(Math.min(Math.max(1, nextPage), document.numPages));
  };

  if (error) {
    return (
      <div className="pdf-viewer pdf-viewer--error" role="alert">
        <AlertTriangle size={30} />
        <div>
          <strong>تعذر عرض ملف PDF داخل الصفحة</strong>
          <p>{error}</p>
          <a className="secondary-button" href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> فتح الملف في نافذة جديدة
          </a>
        </div>
      </div>
    );
  }

  return (
    <section className="pdf-viewer" aria-label={`عارض PDF: ${title}`}>
      <div className="pdf-viewer__toolbar" aria-label="أدوات ملف PDF">
        <div className="pdf-viewer__navigation">
          <button type="button" onClick={() => goToPage(pageNumber - 1)} disabled={!document || pageNumber <= 1} aria-label="الصفحة السابقة">
            <ChevronRight size={17} />
          </button>
          <span aria-live="polite">{pageLabel}</span>
          <button type="button" onClick={() => goToPage(pageNumber + 1)} disabled={!document || pageNumber >= document.numPages} aria-label="الصفحة التالية">
            <ChevronLeft size={17} />
          </button>
        </div>
        <div className="pdf-viewer__zoom">
          <button type="button" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, +(value - ZOOM_STEP).toFixed(2)))} disabled={zoom <= MIN_ZOOM} aria-label="تصغير">
            <Minus size={17} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, +(value + ZOOM_STEP).toFixed(2)))} disabled={zoom >= MAX_ZOOM} aria-label="تكبير">
            <Plus size={17} />
          </button>
          <button type="button" onClick={() => setZoom(1)} aria-label="إعادة التكبير للوضع الافتراضي" title="الحجم الافتراضي">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      <div className="pdf-viewer__stage" ref={stageRef} tabIndex={0}>
        {!document && (
          <div className="pdf-viewer__loading" role="status">
            <LoaderCircle className="spin" size={30} />
            <p>{loadingProgress === null ? 'جارٍ تحميل ملف PDF…' : `جارٍ تحميل ملف PDF… ${loadingProgress}%`}</p>
          </div>
        )}
        {isRendering && document && (
          <div className="pdf-viewer__rendering" role="status" aria-label="جارٍ عرض الصفحة">
            <LoaderCircle className="spin" size={22} />
          </div>
        )}
        <canvas ref={canvasRef} aria-label={`${title}، ${pageLabel}`} />
      </div>
    </section>
  );
}
