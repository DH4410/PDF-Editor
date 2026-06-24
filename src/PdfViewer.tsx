import { useEffect, useRef, useState } from 'react';
import { pdfjsLib } from './pdfjs';

interface PdfViewerProps {
  bytes: Uint8Array;
  placing: boolean;
  // Reports a click position in PDF user-space points (origin bottom-left),
  // already corrected for scale and page rotation.
  onPlace: (pageIndex: number, pdfX: number, pdfY: number) => void;
}

// Renders every page of a PDF to its own canvas and, while `placing`, turns a
// click on a page into a position in PDF coordinates.
export default function PdfViewer({ bytes, placing, onPlace }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Keep the latest placing/onPlace in refs so the render effect doesn't need
  // to re-run (and re-render the whole document) when they change.
  const placingRef = useRef(placing);
  const onPlaceRef = useRef(onPlace);
  useEffect(() => { placingRef.current = placing; }, [placing]);
  useEffect(() => { onPlaceRef.current = onPlace; }, [onPlace]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    setLoading(true);

    (async () => {
      // pdf.js detaches the buffer it is given, so hand it a copy.
      const pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
      if (cancelled) return;
      container.innerHTML = '';

      const dpr = window.devicePixelRatio || 1;
      const targetWidth = Math.min(820, (container.clientWidth || 820) - 32);

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        if (cancelled) return;

        const cssScale = targetWidth / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale: cssScale * dpr });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;
        canvas.style.display = 'block';
        canvas.style.background = '#fff';
        canvas.style.boxShadow = '0 1px 4px rgba(15,23,42,0.18)';

        const wrapper = document.createElement('div');
        wrapper.style.margin = '0 auto 16px';
        wrapper.style.width = 'fit-content';
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);

        const pageIndex = i - 1;
        canvas.addEventListener('click', (ev) => {
          if (!placingRef.current) return;
          const rect = canvas.getBoundingClientRect();
          const vx = (ev.clientX - rect.left) * (canvas.width / rect.width);
          const vy = (ev.clientY - rect.top) * (canvas.height / rect.height);
          const [pdfX, pdfY] = viewport.convertToPdfPoint(vx, vy);
          onPlaceRef.current(pageIndex, pdfX, pdfY);
        });

        await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
        if (cancelled) return;
      }
      setLoading(false);
    })().catch((err) => {
      if (!cancelled) {
        console.error('Failed to render PDF:', err);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [bytes]);

  return (
    <div className="w-full h-full overflow-auto bg-slate-200 py-6 px-4">
      {loading && <p className="text-center text-sm text-slate-500 mb-4">Rendering PDF…</p>}
      <div ref={containerRef} style={{ cursor: placing ? 'crosshair' : 'default' }} />
    </div>
  );
}
