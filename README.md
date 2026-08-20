# Image Converter

A small local web app for converting one or more images with ImageMagick. Drop
images into the browser, choose an output format, and download either the
converted file or a ZIP archive for a batch.

Uploaded and converted files are temporary runtime data. The server removes
them after a response completes, and the runtime directories are excluded from
version control.

## Requirements

- Node.js 20 or newer
- ImageMagick 7 with the `magick` command available on `PATH`

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The frontend proxies `/api` requests
to the Express server on port 3001. Set `PORT` to use another backend port and
update `vite.config.js` to match during local development.

The API accepts up to 20 files per request and 25 MB per file. Supported output
formats are JPEG, PNG, WebP, GIF, BMP, TIFF, ICO, and AVIF; actual codec support
depends on the local ImageMagick build.

## Checks

```bash
npm run lint
npm run build
```

## License

[MIT](LICENSE).
