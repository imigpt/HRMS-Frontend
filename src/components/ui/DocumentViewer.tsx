/**
 * DocumentViewer — universal in-app file viewer.
 *
 * Supported types (auto-detected from URL extension / mimeType):
 *   image  → <img>
 *   pdf    → <iframe> (browser built-in PDF viewer)
 *   word   → Microsoft Office Online embed
 *   excel  → Microsoft Office Online embed
 *   ppt    → Microsoft Office Online embed
 *   text   → fetched and rendered as <pre> (txt, csv, md, json, yaml…)
 *   other  → "preview unavailable" card with download button
 *
 * Every type also shows a Download button in the header.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Loader2, AlertCircle } from 'lucide-react';

// ─── helpers ──────────────────────────────────────────────────────────────────

type FileKind = 'image' | 'pdf' | 'word' | 'excel' | 'ppt' | 'text' | 'unknown';

const extOf = (s: string) =>
  (s.split('?')[0].split('.').pop() ?? '').toLowerCase();

/**
 * Detect file kind from URL extension, mimeType, OR original fileName.
 * fileName is checked last as a reliable fallback when the URL has no extension
 * (common with Cloudinary RAW uploads).
 */
const detectKind = (url: string, mimeType?: string, fileName?: string): FileKind => {
  const urlExt  = extOf(url);
  const nameExt = fileName ? extOf(fileName) : '';
  // prefer URL ext, fall back to filename ext
  const ext  = urlExt || nameExt;
  const mime = (mimeType ?? '').toLowerCase();

  if (mime.startsWith('image/') || /^(jpg|jpeg|png|gif|webp|svg|bmp|tiff)$/.test(ext))
    return 'image';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (/^(doc|docx)$/.test(ext) || mime.includes('word') || mime.includes('document'))
    return 'word';
  if (
    /^(xls|xlsx)$/.test(ext) ||
    mime.includes('spreadsheet') ||
    mime.includes('excel')
  )
    return 'excel';
  if (
    /^(ppt|pptx)$/.test(ext) ||
    mime.includes('presentation') ||
    mime.includes('powerpoint')
  )
    return 'ppt';
  if (
    /^(txt|csv|md|json|yaml|yml|log|xml|html|htm)$/.test(ext) ||
    mime.startsWith('text/')
  )
    return 'text';
  return 'unknown';
};

/**
 * Google Docs Viewer embed — handles raw/binary URLs (docx, xlsx, pptx) better
 * than Microsoft Office Online because it reads file magic bytes, not just URL extension.
 */
const googleDocsEmbed = (url: string) =>
  `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

const KIND_LABEL: Record<FileKind, string> = {
  image: 'Image',
  pdf: 'PDF',
  word: 'Word',
  excel: 'Excel',
  ppt: 'PowerPoint',
  text: 'Text',
  unknown: 'File',
};

// ─── component ────────────────────────────────────────────────────────────────

interface DocumentViewerProps {
  open: boolean;
  onClose: () => void;
  /** Public Cloudinary (or any public HTTPS) URL */
  url: string;
  fileName?: string;
  /** Optional mimeType hint (improves detection) */
  mimeType?: string;
}

const DocumentViewer = ({
  open,
  onClose,
  url,
  fileName = 'Document',
  mimeType,
}: DocumentViewerProps) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState(false);

  const kind = detectKind(url, mimeType, fileName);
  // prefer the extension from fileName when URL has none (Cloudinary RAW)
  const ext = extOf(url) || extOf(fileName);

  // Fetch plain-text content lazily
  useEffect(() => {
    if (!open || kind !== 'text') return;
    setTextLoading(true);
    setTextContent(null);
    setTextError(false);
    fetch(url)
      .then((r) => r.text())
      .then((t) => setTextContent(t))
      .catch(() => setTextError(true))
      .finally(() => setTextLoading(false));
  }, [open, url, kind]);

  // Trigger browser download — fetch as blob to bypass cross-origin download restriction
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      // Fallback: open in new tab (browser will prompt save-as for unknown types)
      window.open(url, '_blank', 'noreferrer');
    }
  };

  // ── render content area ──────────────────────────────────────────────────
  const renderBody = () => {
    switch (kind) {
      case 'image':
        return (
          <div className="flex items-center justify-center min-h-[300px] bg-secondary/30 rounded-lg p-2">
            <img
              src={url}
              alt={fileName}
              className="max-w-full max-h-[68vh] object-contain rounded-lg"
            />
          </div>
        );

      case 'pdf':
        return (
          <iframe
            src={url}
            title={fileName}
            className="w-full rounded-lg border border-border"
            style={{ height: '70vh', border: 'none' }}
          />
        );

      case 'word':
      case 'excel':
      case 'ppt':
        return (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">
              Rendered via Google Docs Viewer — requires internet access
            </p>
            <iframe
              src={googleDocsEmbed(url)}
              title={fileName}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              className="w-full rounded-lg border border-border"
              style={{ height: '70vh', border: 'none' }}
            />
          </div>
        );

      case 'text':
        if (textLoading)
          return (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          );
        if (textError)
          return (
            <div className="flex flex-col items-center gap-3 h-48 justify-center text-muted-foreground">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">Could not load content. Try downloading instead.</p>
            </div>
          );
        return (
          <pre className="text-sm text-foreground bg-secondary/50 rounded-lg p-4 overflow-auto max-h-[65vh] whitespace-pre-wrap break-words font-mono leading-relaxed">
            {textContent}
          </pre>
        );

      default:
        return (
          <div className="flex flex-col items-center gap-4 justify-center h-52 text-muted-foreground">
            <FileText className="h-16 w-16 opacity-30" />
            <div className="text-center space-y-1">
              <p className="font-medium text-foreground">Preview not available</p>
              <p className="text-sm">
                {ext ? `.${ext.toUpperCase()} files` : 'This file type'} cannot be previewed
                directly in the browser.
              </p>
              <p className="text-sm">Click <strong>Download</strong> to open it locally.</p>
            </div>
            <Button onClick={handleDownload} className="mt-2">
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full bg-card border-border p-0 gap-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold min-w-0">
              <FileText className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate">{fileName}</span>
              <Badge variant="outline" className="text-xs flex-shrink-0">
                {KIND_LABEL[kind] || (ext ? ext.toUpperCase() : 'File')}
              </Badge>
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex-shrink-0 h-8 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="p-4 overflow-auto">{renderBody()}</div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentViewer;
