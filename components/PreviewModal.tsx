'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';
import { CertificatePreview, CertificatePreviewData } from './CertificatePreview';

interface PreviewModalProps {
  data: CertificatePreviewData;
  trigger?: React.ReactNode;
}

/**
 * PreviewModal displays a certificate preview in a modal overlay.
 * Can be customized with a custom trigger button or use the default.
 */
export function PreviewModal({ data, trigger }: PreviewModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      {trigger ? (
        <div onClick={() => setOpen(true)}>
          {trigger}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setOpen(true)}
        >
          <Eye className="h-4 w-4" />
          Preview Certificate
        </Button>
      )}

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold">Certificate Preview</h2>
                <p className="text-sm text-gray-600 mt-1">
                  This is a live preview of how your certificate will appear when downloaded.
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Close preview modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <CertificatePreview data={data} />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-white">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
