import { useState, useRef } from 'react';
import { Upload, File, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';
import { useTranslation } from 'react-i18next';

interface UploadZoneProps {
  onUploadComplete?: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const { t } = useTranslation("content");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileDialogOpenRef = useRef(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadStatus('idle');
    setErrorMessage('');
    // Reset file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      setUploadProgress(100);
      setUploadStatus('success');
      setSelectedFile(null);
      
      setTimeout(() => {
        onUploadComplete?.();
        setUploadStatus('idle');
      }, 2000);
    } catch (error: any) {
      setUploadStatus('error');
      setErrorMessage(error.message || t('content.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          flex flex-col items-center justify-center min-h-[300px] mt-12
          ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600'}
          ${uploadStatus === 'success' ? 'border-green-500 bg-green-500/10' : ''}
          ${uploadStatus === 'error' ? 'border-red-500 bg-red-500/10' : ''}
        `}
      >
        {uploadStatus === 'success' ? (
          <div className="space-y-2">
            <CheckCircle2 className="h-8 w-8 mx-auto text-green-500" />
            <p className="text-green-500 font-medium">{t('uploadSuccess')}</p>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
            <p className="text-red-500 font-medium">{errorMessage}</p>
            <Button onClick={() => setUploadStatus('idle')} size="sm">
              {t('tryAgain')}
            </Button>
          </div>
        ) : selectedFile ? (
          <div className="space-y-3">
            <File className="h-8 w-8 mx-auto text-purple-400" />
            <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <File className="h-4 w-4 text-purple-400 flex-shrink-0" />
                <span className="text-sm text-white truncate">{selectedFile.name}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
              {!uploading && (
                <button
                  onClick={() => setSelectedFile(null)}
                  className="ml-2 text-gray-400 hover:text-red-500 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-gray-400">{t('uploading')}</p>
              </div>
            )}

            {!uploading && (
              <div className="flex gap-2 justify-center">
                <Button onClick={handleUpload} className="bg-purple-600 hover:bg-purple-700">
                  <Upload className="h-4 w-4 mr-2" />
                  {t('upload')}
                </Button>
                <Button onClick={() => setSelectedFile(null)} variant="outline">
                  {t('cancel')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
            <p className="text-base font-medium text-white mb-2">
              {t('dragDropFiles')}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              {t('supportedFormats')}: MP3, M4A, AAC, WAV, OGG, FLAC, OPUS
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="audio/*"
              onChange={(e) => {
                fileDialogOpenRef.current = false;
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <Button
              onClick={() => {
                // Use ref for synchronous check to prevent rapid clicks
                if (!fileDialogOpenRef.current) {
                  fileDialogOpenRef.current = true;
                  console.log('🔍 File picker button clicked - attempting to open file dialog...');
                  try {
                    // Click immediately
                    fileInputRef.current?.click();
                    console.log('✅ File input click() method called successfully');
                  } catch (error) {
                    console.error('❌ Error clicking file input:', error);
                    alert('Error opening file picker. Check browser console for details.');
                  }
                  // Reset after dialog interaction or timeout
                  setTimeout(() => {
                    fileDialogOpenRef.current = false;
                  }, 1000);
                } else {
                  console.warn('⚠️ File picker already open, ignoring click');
                }
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('selectFiles')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

