import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const archiver = require('archiver');
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;
const supportedFormats = new Set(['jpg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'ico', 'avif']);

app.use(cors());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'image-converter-api' });
});

// Configure multer for temp file storage
const upload = multer({
  dest: path.join(__dirname, 'uploads/'),
  limits: {
    files: 20,
    fileSize: 25 * 1024 * 1024,
  },
});

// Clean up helper
const cleanup = (files) => {
  files.forEach(file => {
    fs.unlink(file.path, err => {
      if (err) console.error(`Failed to cleanup ${file.path}:`, err);
    });
  });
};

app.post('/api/convert', upload.array('images'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const format = req.body.format || 'jpg';
  if (!supportedFormats.has(format)) {
    cleanup(req.files);
    return res.status(400).json({ error: 'Unsupported output format' });
  }
  const outDir = path.join(__dirname, 'converted');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const convertedFiles = [];
  const errors = [];

  for (const file of req.files) {
    // Generate output filename
    const originalName = path.parse(file.originalname).name;
    const outPath = path.join(outDir, `${originalName}-${Date.now()}.${format}`);

    try {
      await new Promise((resolve, reject) => {
        // Use ImageMagick 'magick' command. (v7+ is 'magick', older is 'convert')
        // Using 'magick' per system check.
        const proc = spawn('magick', [file.path, outPath]);

        let errorOutput = '';
        proc.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            resolve(outPath);
          } else {
            reject(new Error(`ImageMagick exited with code ${code}. Error: ${errorOutput}`));
          }
        });

        proc.on('error', (err) => {
          reject(err);
        });
      });

      convertedFiles.push({
        path: outPath,
        name: `${originalName}.${format}`
      });
    } catch (error) {
      console.error(`Conversion error for ${file.originalname}:`, error);
      errors.push({ file: file.originalname, error: error.message });
    }
  }

  // Cleanup uploaded files
  cleanup(req.files);

  if (convertedFiles.length === 0) {
    return res.status(500).json({ error: 'All conversions failed', details: errors });
  }

  // If single file, return it directly
  if (convertedFiles.length === 1) {
    const file = convertedFiles[0];
    res.download(file.path, file.name, (err) => {
      if (err) console.error('Download error:', err);
      // Cleanup converted file
      fs.unlink(file.path, () => {});
    });
    return;
  }

  // If multiple files, zip them
  const zipPath = path.join(outDir, `converted-${Date.now()}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    res.download(zipPath, 'converted-images.zip', (err) => {
      if (err) console.error('Zip download error:', err);
      // Cleanup
      fs.unlink(zipPath, () => {});
      convertedFiles.forEach(f => fs.unlink(f.path, () => {}));
    });
  });

  archive.on('error', (err) => {
    console.error('Archiver error:', err);
    res.status(500).json({ error: 'Failed to create zip archive' });
  });

  archive.pipe(output);

  convertedFiles.forEach(file => {
    archive.file(file.path, { name: file.name });
  });

  archive.finalize();
});

app.listen(port, () => {
  console.log(`Backend API running on port ${port}`);
});
