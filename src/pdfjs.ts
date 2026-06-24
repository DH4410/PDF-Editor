import * as pdfjsLib from 'pdfjs-dist';
// Styles for the interactive form/annotation layer.
import 'pdfjs-dist/web/pdf_viewer.css';
// Vite resolves this to a hashed asset URL and bundles the worker for production.
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjsLib };
