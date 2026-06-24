import * as pdfjsLib from 'pdfjs-dist';
// Vite resolves this to a hashed asset URL and bundles the worker for production.
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export { pdfjsLib };
