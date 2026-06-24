import React, { useState, useCallback } from 'react';
import { UploadCloud, Unlock, FileCheck, AlertCircle, RefreshCw, ChevronLeft, Download } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [unlockedPdfUrl, setUnlockedPdfUrl] = useState<string | null>(null);

  const processPDF = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setIsProcessing(true);
    setResult(null);
    try {
      const arrayBuffer = await uploadedFile.arrayBuffer();
      // Load the PDF. This automatically strips standard owner-password restrictions when saved.
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      let fieldsUnlocked = 0;
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      // Find any form fields that are locked and unlock them
      fields.forEach((field) => {
        if (field.isReadOnly()) {
          field.disableReadOnly();
          fieldsUnlocked++;
        }
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setUnlockedPdfUrl(url);
    } catch (error) {
      console.error(error);
      setResult({
        success: false,
        message: 'Failed to process PDF. It might be heavily encrypted or not a valid PDF document.',
      });
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      processPDF(droppedFile);
    } else {
      setResult({ success: false, message: 'Please upload a valid PDF file.' });
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processPDF(e.target.files[0]);
    }
  };

  const handleCloseViewer = () => {
    if (unlockedPdfUrl) {
      URL.revokeObjectURL(unlockedPdfUrl);
    }
    setUnlockedPdfUrl(null);
    setFile(null);
    setResult(null);
  };

  if (unlockedPdfUrl) {
    return (
      <div className="flex flex-col h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
        <nav className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseViewer}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>
            <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block"></div>
            <span className="font-semibold text-lg tracking-tight hidden sm:block">Unlocked PDF</span>
            <span className="text-sm text-slate-500 truncate max-w-[200px] sm:max-w-[300px] ml-2">
              {file?.name}
            </span>
          </div>
          <a
            href={unlockedPdfUrl}
            download={`unlocked_${file?.name}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download
          </a>
        </nav>

        <div className="flex-1 w-full h-full bg-slate-200 relative">
          <object 
            data={`${unlockedPdfUrl}#toolbar=1`} 
            type="application/pdf"
            className="w-full h-full absolute inset-0 z-10" 
          >
             <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-slate-100 z-0">
               <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-md">
                 <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                 <h3 className="text-lg font-semibold text-slate-800 mb-2">Preview unavailable</h3>
                 <p className="text-slate-600 mb-6 text-sm">
                   Your browser couldn't display the PDF preview. Download the unlocked file to view and fill it.
                 </p>
                 <a 
                   href={unlockedPdfUrl} 
                   download={`unlocked_${file?.name}`}
                   className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                 >
                   <Download className="w-4 h-4 mr-2" />
                   Download Unlocked PDF
                 </a>
               </div>
            </div>
          </object>
        </div>
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
          <p className="text-slate-500 text-sm">Removes "Read-Only" restrictions from PDF forms so you can fill them directly in your browser.</p>
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

        {result && !result.success && (
          <div className="mt-6 p-4 rounded-lg flex items-start gap-3 border bg-red-50 border-red-200 text-red-800">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{result.message}</p>
          </div>
        )}
        
        <div className="mt-8 bg-white p-5 rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600">
          <h3 className="font-semibold text-slate-800 mb-2">How it works:</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Finds all interactive form fields and removes their "Read-Only" flag.</li>
            <li>Opens the unlocked document instantly in a built-in viewer.</li>
            <li>Fill it out and save directly using the browser's PDF tools.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
