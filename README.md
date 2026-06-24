# PDF Form Unlocker

A fully client-side web app that removes **"Read-Only" restrictions** from PDF forms and lets you
**add a signature** — directly in your browser. Drop in a locked PDF and it strips the read-only
flags from the form fields, renders the document in a built-in viewer, and lets you draw a
signature and click anywhere to place it before downloading the finished file.

Everything runs locally in your browser using [`pdf-lib`](https://github.com/Hopding/pdf-lib) and
[`pdf.js`](https://mozilla.github.io/pdf.js/) — your files are never uploaded to a server, and
**no API key is required**.

> The repository is named `PDF-Editor`; the app itself is the "PDF Form Unlocker" described here.

## Features

- Drag-and-drop or click to upload a PDF
- Removes the "Read-Only" flag from every interactive form field
- Strips standard owner-password restrictions when the document is re-saved
- Draw a signature and click to place it anywhere on any page (add as many as you like)
- Built-in PDF viewer with one-click download of the finished file

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- [pdf-lib](https://github.com/Hopding/pdf-lib) (editing) + [pdf.js](https://mozilla.github.io/pdf.js/) (rendering)

## Run Locally

**Prerequisites:** [Node.js](https://nodejs.org/)

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
   The app runs at **http://localhost:3000**.

## Build for Production

```bash
npm run build
```

The static site is written to `dist/`, which can be deployed to any static host (e.g. Vercel).
