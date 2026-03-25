'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PdfPreviewFrameProps {
  src: string;
  title: string;
  className?: string;
}

export function PdfPreviewFrame({ src, title, className = '' }: PdfPreviewFrameProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative h-full w-full ${className}`}>
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/95 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading PDF preview...</span>
        </div>
      )}

      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive">
          Failed to load PDF preview.
        </div>
      ) : (
        <iframe
          src={src}
          title={title}
          className="h-full w-full border-0"
          onLoad={() => {
            setIsLoading(false);
          }}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      )}
    </div>
  );
}