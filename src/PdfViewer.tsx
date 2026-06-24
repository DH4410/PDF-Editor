import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfjsLib } from './pdfjs';

interface PdfViewerProps {
  doc: PDFDocumentProxy;
  placing: boolean;
  // Reports a click position in PDF user-space points (origin bottom-left),
  // already corrected for scale and page rotation.
  onPlace: (pageIndex: number, pdfX: number, pdfY: number) => void;
}

// Minimal link service: form rendering needs one, but this app has no link
// navigation, so every method is a no-op.
const linkService: any = {
  externalLinkEnabled: true,
  externalLinkTarget: null,
  externalLinkRel: null,
  getDestinationHash: () => '#',
  getAnchorUrl: () => '#',
  addLinkAttributes: (link: HTMLAnchorElement, url: string) => { link.href = url || '#'; },
  goToDestination: async () => {},
  goToPage: () => {},
  setHash: () => {},
  executeNamedAction: () => {},
  executeSetOCGState: () => {},
  isPageVisible: () => true,
  isPageCached: () => true,
};

// Renders every page of a PDF to a canvas with an interactive form layer on
// top. While `placing`, the form layer is click-through so a click on the page
// becomes a signature position in PDF coordinates.
export default function PdfViewer({ doc, placing, onPlace }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Keep latest placing/onPlace in refs so the (expensive) render effect does
  // not re-run when they change.
  const placingRef = useRef(placing);
  const onPlaceRef = useRef(onPlace);
  useEffect(() => { placingRef.current = placing; }, [placing]);
  useEffect(() => { onPlaceRef.current = onPlace; }, [onPlace]);

  // Toggle form-field interactivity without re-rendering the document.
  useEffect(() => {
    layersRef.current.forEach((layer) => layer.togglePointerEvents(!placing));
  }, [placing]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    setLoading(true);
    layersRef.current = [];

    (async () => {
      container.innerHTML = '';
      const dpr = window.devicePixelRatio || 1;
      const targetWidth = Math.min(820, (container.clientWidth || 820) - 32);

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        if (cancelled) return;

        const cssScale = targetWidth / page.getViewport({ scale: 1 }).width;
        // High-res viewport for a crisp canvas...
        const renderViewport = page.getViewport({ scale: cssScale * dpr });
        // ...and a CSS-pixel viewport that the displayed canvas and the form
        // layer are both sized against (the form layer positions widgets in CSS
        // pixels, so it must NOT include devicePixelRatio).
        const cssViewport = page.getViewport({ scale: cssScale });

        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.margin = '0 auto 16px';
        wrapper.style.width = `${cssViewport.width}px`;
        wrapper.style.height = `${cssViewport.height}px`;

        const canvas = document.createElement('canvas');
        canvas.width = renderViewport.width;
        canvas.height = renderViewport.height;
        canvas.style.width = `${cssViewport.width}px`;
        canvas.style.height = `${cssViewport.height}px`;
        canvas.style.display = 'block';
        canvas.style.background = '#fff';
        canvas.style.boxShadow = '0 1px 4px rgba(15,23,42,0.18)';
        wrapper.appendChild(canvas);

        const pageIndex = i - 1;
        canvas.addEventListener('click', (ev) => {
          if (!placingRef.current) return;
          const rect = canvas.getBoundingClientRect();
          const vx = (ev.clientX - rect.left) * (canvas.width / rect.width);
          const vy = (ev.clientY - rect.top) * (canvas.height / rect.height);
          const [pdfX, pdfY] = renderViewport.convertToPdfPoint(vx, vy);
          onPlaceRef.current(pageIndex, pdfX, pdfY);
        });

        const layerDiv = document.createElement('div');
        layerDiv.className = 'annotationLayer';
        layerDiv.style.position = 'absolute';
        layerDiv.style.top = '0';
        layerDiv.style.left = '0';
        // The form layer sizes/positions widgets via these CSS variables; pdf.js
        // expects the host app to set them (the full viewer does this on a parent).
        layerDiv.style.setProperty('--scale-factor', String(cssScale));
        layerDiv.style.setProperty('--total-scale-factor', String(cssScale));
        wrapper.appendChild(layerDiv);

        container.appendChild(wrapper);

        await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport: renderViewport }).promise;
        if (cancelled) return;

        const annotations = await page.getAnnotations({ intent: 'display' });
        if (cancelled) return;

        const layerViewport = cssViewport.clone({ dontFlip: true });
        const layer = new pdfjsLib.AnnotationLayer({
          div: layerDiv,
          accessibilityManager: null,
          annotationCanvasMap: null,
          annotationEditorUIManager: null,
          page,
          viewport: layerViewport,
          structTreeLayer: null,
          commentManager: null,
          linkService,
          annotationStorage: doc.annotationStorage,
        });
        await layer.render({
          annotations,
          div: layerDiv,
          page,
          viewport: layerViewport,
          linkService,
          annotationStorage: doc.annotationStorage,
          renderForms: true,
        });
        if (cancelled) return;
        // render() internally calls setLayerDimensions, which sizes the div via
        // a CSS round() expression that evaluates to 0×0 here (collapsing every
        // field). Override with explicit pixel dimensions afterwards.
        layerDiv.style.width = `${cssViewport.width}px`;
        layerDiv.style.height = `${cssViewport.height}px`;
        layer.togglePointerEvents(!placingRef.current);
        layersRef.current.push(layer);
      }
      setLoading(false);
    })().catch((err) => {
      if (!cancelled) {
        console.error('Failed to render PDF:', err);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [doc]);

  return (
    <div className="w-full h-full overflow-auto bg-slate-200 py-6 px-4">
      {loading && <p className="text-center text-sm text-slate-500 mb-4">Rendering PDF…</p>}
      <div ref={containerRef} style={{ cursor: placing ? 'crosshair' : 'default' }} />
    </div>
  );
}
