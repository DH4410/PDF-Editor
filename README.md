# PDF Form Unlocker

A fully client-side web app that removes **"Read-Only" restrictions** from PDF forms so you can
fill them out directly in your browser. Drop in a locked PDF and it strips the read-only flags
from the form fields, then opens the unlocked document in a built-in viewer where you can fill it
in and download it.

Everything runs locally in your browser using [`pdf-lib`](https://github.com/Hopding/pdf-lib) —
your files are never uploaded to a server, and **no API key is required**.

> The repository is named `PDF-Editor`; the app itself is the "PDF Form Unlocker" described here.

## Features

- Drag-and-drop or click to upload a PDF
- Removes the "Read-Only" flag from every interactive form field
- Strips standard owner-password restrictions when the document is re-saved
- Built-in PDF viewer with one-click download of the unlocked file

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- [pdf-lib](https://github.com/Hopding/pdf-lib)

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
