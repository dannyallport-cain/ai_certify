'use client';

import * as pdfjsLib from 'pdfjs-dist';

let configured = false;

export function configurePdfJsWorker() {
  if (configured) return pdfjsLib;

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  configured = true;
  return pdfjsLib;
}
