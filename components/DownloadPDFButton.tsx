'use client';

import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import { useState } from 'react';

interface DownloadPDFButtonProps {
  certificateId: number;
  certificateNumber: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  className?: string;
}

export function DownloadPDFButton({
  certificateId,
  certificateNumber,
  variant = 'outline',
  size = 'sm',
  showText = true,
  className = ''
}: DownloadPDFButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDownloading(true);
    
    try {
      const response = await fetch(`/api/certificates/${certificateId}/pdf`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${certificateNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      variant={variant}
      size={size}
      className={className}
    >
      {isDownloading ? (
        <>
          <FileText className="mr-2 h-4 w-4 animate-spin" />
          {showText && 'Generating...'}
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          {showText && 'Download PDF'}
        </>
      )}
    </Button>
  );
}
