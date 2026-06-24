import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UploadCloud, Unlock, AlertCircle, RefreshCw, ChevronLeft, Download, PenTool, Check } from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { pdfjsLib } from './pdfjs';
import PdfViewer from './PdfViewer';
import SignaturePad from './SignaturePad';

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [proxy, setProxy] = useState<PDFDocumentProxy | null>(null);
  const [showPad, setShowPad] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);

  // The pdf.js document is the source of truth for rendering AND for typed form
  // values (kept in its annotationStorage). Keep it in a ref so the download and
  // sign handlers can call saveDocument() without re-renders.
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);

  useEffect(() => {
    if (!pdfBytes) {
      setProxy(null);
      return;
    }
    let cancelled = false;
    const task = pdfjsLib.getDocument({ data: pdfBytes.slice() });
    task.promise
      .then((doc) => {
        if (cancelled) {
          (doc as any).destroy?.();
          return;
        }
        const prev = pdfDocRef.current;
        pdfDocRef.current = doc;
        setProxy(doc);
        (prev as any)?.destroy?.();
      })
      .catch((err) => console.error('Failed to load PDF:', err));
    return () => { cancelled = true; };
  }, [pdfBytes]);

  const processPDF = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setError(null);
    try {
      const pdfDoc = await PDFDocument.load(await uploadedFile.arrayBuffer());
      // Loading and re-saving strips standard owner-password restrictions;
      // clearing the read-only flag makes the form fields fillable.
      pdfDoc.getForm().getFields().forEach((field) => {
        if (field.isReadOnly()) field.disableReadOnly();
      });
      setPdfBytes(await pdfDoc.save());
    } catch (err) {
      console.error(err);
      setError('Failed to process PDF. It might be heavily encrypted or not a valid PDF document.');
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlace = async (pageIndex: number, pdfX: number, pdfY: number) => {
    const doc = pdfDocRef.current;
    if (!doc || !pendingSignature) return;
    try {
      // Capture anything typed into the form so it survives the re-render.
      const current = await doc.saveDocument();
      const pdfDoc = await PDFDocument.load(current);
      const png = await pdfDoc.embedPng(dataUrlToBytes(pendingSignature));
      const page = pdfDoc.getPages()[pageIndex];
      const sigW = Math.min(180, page.getSize().width * 0.4);
      const sigH = (png.height / png.width) * sigW;
      const rot = page.getRotation().angle % 360;
      // pdfX/pdfY mark where the user clicked, in PDF points (origin bottom-left).
      if (rot === 0) {
        page.drawImage(png, { x: pdfX - sigW / 2, y: pdfY - sigH / 2, width: sigW, height: sigH });
      } else {
        // Keep the signature upright on rotated pages.
        page.drawImage(png, { x: pdfX, y: pdfY, width: sigW, height: sigH, rotate: degrees(-rot) });
      }
      setPdfBytes(await pdfDoc.save());
    } catch (err) {
      console.error('Failed to add signature:', err);
    }
  };

  const handleDownload = async () => {
    const doc = pdfDocRef.current;
    if (!doc) return;
    setIsSaving(true);
    try {
      const bytes = await doc.saveDocument();
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `filled_${file?.name || 'document.pdf'}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    (pdfDocRef.current as any)?.destroy?.();
    pdfDocRef.current = null;
    setProxy(null);
    setPdfBytes(null);
    setFile(null);
    setError(null);
    setShowPad(false);
    setPendingSignature(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') {
      processPDF(dropped);
    } else {
      setError('Please upload a valid PDF file.');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processPDF(e.target.files[0]);
  };

  if (pdfBytes) {
    return (
      <div className="flex flex-col h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
        <nav className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={reset}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <span className="text-sm text-slate-500 truncate">{file?.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowPad(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <PenTool className="w-4 h-4" />
              <span className="hidden sm:inline">Add signature</span>
              <span className="sm:hidden">Sign</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!proxy || isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {isSaving ? 'Saving…' : 'Download'}
            </button>
          </div>
        </nav>

        {pendingSignature && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 sm:px-6 py-2.5 text-sm text-blue-800 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 shrink-0" />
              <span>Click on the page to place your signature. Keep clicking to add more.</span>
            </div>
            <button
              onClick={() => setPendingSignature(null)}
              className="flex items-center gap-1.5 font-medium bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors shrink-0"
            >
              <Check className="w-4 h-4" />
              Done
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0">
          {proxy ? (
            <PdfViewer doc={proxy} placing={!!pendingSignature} onPlace={handlePlace} />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading PDF…</div>
          )}
        </div>

        {showPad && (
          <SignaturePad
            onCancel={() => setShowPad(false)}
            onComplete={(dataUrl) => {
              setPendingSignature(dataUrl);
              setShowPad(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="bg-blue-600 text-white w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-200">
            <Unlock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">PDF Form Unlocker</h1>
          <p className="text-slate-500 text-sm">
            Unlock read-only PDF forms, fill them in, and add your signature — entirely in your browser.
          </p>
        </div>

        <label
          className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ease-in-out
            ${isDragging ? 'border-blue-600 bg-blue-50/50 shadow-inner' : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400'}
            ${isProcessing ? 'pointer-events-none opacity-70' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center select-none pointer-events-none px-4">
            {isProcessing ? (
              <>
                <RefreshCw className="w-10 h-10 mb-4 text-blue-600 animate-spin" />
                <p className="mb-2 text-sm font-medium text-slate-700">Unlocking PDF settings...</p>
              </>
            ) : (
              <>
                <UploadCloud className={`w-10 h-10 mb-4 transition-colors ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
                <p className="mb-2 text-sm font-medium">
                  <span className="text-blue-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500">Upload a locked PDF form</p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
        </label>

        {error && (
          <div className="mt-6 p-4 rounded-lg flex items-start gap-3 border bg-red-50 border-red-200 text-red-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="mt-8 bg-white p-5 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600">
          <h3 className="font-semibold text-slate-800 mb-2">How it works:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Removes the "Read-Only" flag so you can fill the form fields in your browser.</li>
            <li>Draw a signature and click anywhere on the page to place it.</li>
            <li>Download the finished PDF — your files never leave your device.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
