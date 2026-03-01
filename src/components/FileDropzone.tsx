import { useCallback, useRef } from 'react';
import { DocxFile } from '../types';
import { formatFileSize, formatDate, validateFile } from '../lib/utils';

interface FileDropzoneProps {
  label: string;
  file: DocxFile | null;
  onFileSelect: (file: File) => void;
}

export function FileDropzone({ label, file, onFileSelect }: FileDropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const selectedFile = files[0];
    
    if (selectedFile) {
      const validation = validateFile(selectedFile);
      if (validation.valid) {
        onFileSelect(selectedFile);
      } else {
        alert(validation.error);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validation = validateFile(files[0]);
      if (validation.valid) {
        onFileSelect(files[0]);
      } else {
        alert(validation.error);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  }, [onFileSelect]);

  return (
    <div className="file-dropzone">
      <label className="file-dropzone-label">{label}</label>
      <div
        className={`file-dropzone-area ${file?.status === 'error' ? 'error' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {file ? (
          <div className="file-info">
            <div className="file-icon-wrapper">
              {file.fileType === 'pdf' ? '📄' : '📝'}
            </div>
            <div className="file-name">{file.name}</div>
            <div className="file-meta">
              <span className="file-meta-item">📦 {formatFileSize(file.size)}</span>
              <span className="file-meta-item">🕒 {formatDate(file.lastModified)}</span>
              {file.fileType && (
                <span className="file-type-badge">{file.fileType.toUpperCase()}</span>
              )}
            </div>
            {file.status === 'error' && file.error && (
              <div className="file-error">❌ {file.error}</div>
            )}
            {file.status === 'ok' && (
              <div className="file-status-ok">✅ Arquivo válido e pronto para comparação</div>
            )}
            {file.status === 'loading' && (
              <div className="file-status-loading">⏳ Processando arquivo...</div>
            )}
          </div>
        ) : (
          <div className="file-dropzone-empty">
            <div className="file-dropzone-icon">📎</div>
            <div className="file-dropzone-text">
              <strong>Arraste um arquivo aqui</strong>
              <span>ou clique para selecionar</span>
            </div>
            <div className="file-dropzone-hint">Formatos aceitos: PDF ou DOCX • Tamanho máximo: 20MB</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,.png,.jpg,.jpeg"
              onChange={handleFileInput}
              className="file-input"
              id={`file-input-${label}`}
            />
            <label htmlFor={`file-input-${label}`} className="file-input-label">
              Selecionar arquivo
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
