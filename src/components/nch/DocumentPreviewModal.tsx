'use client';

// NCH 3.0 — DocumentPreviewModal
// High-fidelity document previewer supporting images, PDFs, official case evidence, and direct downloads.

import { useState } from 'react';
import { FileText, Download, ExternalLink, X, ZoomIn, ZoomOut, RotateCw, FileCode, CheckCircle2 } from 'lucide-react';
import { Modal, Button } from '@/components/nch/ui';
import type { Document } from '@/lib/nch/types';

interface DocumentPreviewModalProps {
  document: Document | null;
  docketNumber?: string;
  open: boolean;
  onClose: () => void;
}

export function DocumentPreviewModal({
  document,
  docketNumber,
  open,
  onClose,
}: DocumentPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!document) return null;

  const docUrl = document.url || `/api/documents/${document.id}`;
  const downloadUrl = `/api/documents/${document.id}?download=1`;
  const isImage = ['PNG', 'JPG', 'JPEG', 'WEBP', 'IMAGE', 'SVG'].includes(document.type.toUpperCase());
  const isPdf = document.type.toUpperCase() === 'PDF';

  const resetControls = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleClose = () => {
    resetControls();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={`${document.name} (${document.type})`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Uploaded by <strong className="text-slate-700">{document.uploadedBy}</strong> · {document.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ExternalLink size={13} />
              <span>Open in New Tab</span>
            </a>
            <a
              href={downloadUrl}
              download={document.name}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-nch-blue-600 hover:bg-nch-blue-700 transition-colors shadow-xs"
            >
              <Download size={13} />
              <span>Download File</span>
            </a>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Toolbar for images */}
        {isImage && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            <span className="text-2xs text-slate-400 font-mono">Zoom: {Math.round(zoom * 100)}%</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-1 hover:bg-slate-200 rounded text-slate-600"
                title="Rotate"
              >
                <RotateCw size={14} />
              </button>
              <button
                type="button"
                onClick={resetControls}
                className="ml-2 px-2 py-0.5 text-2xs hover:bg-slate-200 rounded text-slate-500"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Preview Frame */}
        <div className="relative min-h-[380px] max-h-[560px] overflow-auto bg-slate-900/5 rounded-xl border border-slate-200 flex items-center justify-center p-2">
          {isImage ? (
            <div className="transition-transform duration-150 ease-out p-4 flex items-center justify-center min-w-full min-h-full">
              <img
                src={docUrl}
                alt={document.name}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  maxHeight: '480px',
                }}
                className="rounded shadow-md object-contain border border-slate-200 bg-white"
              />
            </div>
          ) : (
            <iframe
              src={docUrl}
              title={document.name}
              className="w-full h-[520px] rounded-lg border-0 bg-white shadow-2xs"
            />
          )}
        </div>

        {/* Case docket context */}
        {docketNumber && (
          <p className="text-2xs text-slate-400 font-mono text-center">
            Referenced in Case Docket: <strong className="text-slate-600">{docketNumber}</strong>
          </p>
        )}
      </div>
    </Modal>
  );
}
