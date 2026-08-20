import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud,
  FileImage,
  X,
  ChevronDown,
  Wand2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import './index.css';

// Formats supported by ImageMagick
const FORMATS = [
  { value: 'jpg', label: 'JPEG (.jpg)' },
  { value: 'png', label: 'PNG (.png)' },
  { value: 'webp', label: 'WebP (.webp)' },
  { value: 'gif', label: 'GIF (.gif)' },
  { value: 'tiff', label: 'TIFF (.tiff)' },
  { value: 'bmp', label: 'BMP (.bmp)' },
  { value: 'svg', label: 'SVG (.svg)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
  { value: 'ico', label: 'ICO (.ico)' }
];

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function App() {
  const [files, setFiles] = useState([]);
  const [targetFormat, setTargetFormat] = useState('jpg');
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    // Append new files
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.tiff', '.bmp', '.svg', '.heic', '.raw']
    }
  });

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleConvert = async () => {
    if (files.length === 0) return;

    setIsConverting(true);
    setError(null);

    const formData = new FormData();
    formData.append('format', targetFormat);
    files.forEach(file => {
      formData.append('images', file);
    });

    try {
      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Conversion failed');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // If multiple, it returns a zip. Otherwise single file.
      let filename = `converted-${Date.now()}.${targetFormat}`;
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition && contentDisposition.includes('attachment')) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Clear files after successful conversion
      setFiles([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Image Converter</h1>
        <p>Batch convert images to any format with ease.</p>
      </header>

      <div className="glass-panel">
        <div
          {...getRootProps()}
          className={clsx("dropzone", { "active": isDragActive })}
        >
          <input {...getInputProps()} />
          <UploadCloud size={48} className="dropzone-icon" />
          <div className="dropzone-text">
            {isDragActive ? "Drop images here..." : "Drag & drop images here"}
          </div>
          <div className="dropzone-subtext">
            or click to browse files
          </div>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {files.length > 0 && (
          <>
            <div className="file-list">
              {files.map((file, i) => (
                <div key={`${file.name}-${i}`} className="file-item">
                  <div className="file-info">
                    <FileImage size={24} className="file-icon" />
                    <div>
                      <div className="file-name">{file.name}</div>
                      <div className="file-size">{formatBytes(file.size)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="remove-btn"
                    title="Remove file"
                    disabled={isConverting}
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>

            <div className="controls-section">
              <div className="format-selector">
                <label>Convert to</label>
                <div className="select-wrapper">
                  <select
                    value={targetFormat}
                    onChange={e => setTargetFormat(e.target.value)}
                    disabled={isConverting}
                  >
                    {FORMATS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={18} className="select-icon" />
                </div>
              </div>

              <button
                className="convert-btn"
                onClick={handleConvert}
                disabled={isConverting}
              >
                {isConverting ? (
                  <>
                    <Loader2 size={20} className="spinner" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Wand2 size={20} />
                    Convert {files.length} {files.length === 1 ? 'file' : 'files'}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
