import { FileType } from '../types';

export function detectFileType(file: File): FileType {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  if (mimeType === 'application/pdf' || extension === '.pdf') {
    return 'pdf';
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === '.docx'
  ) {
    return 'docx';
  }

  // Fallback por extensão
  if (extension === '.pdf') return 'pdf';
  if (extension === '.docx') return 'docx';

  throw new Error('Tipo de arquivo não suportado. Use PDF ou DOCX.');
}

export function isPdf(file: File): boolean {
  try {
    return detectFileType(file) === 'pdf';
  } catch {
    return false;
  }
}

export function isDocx(file: File): boolean {
  try {
    return detectFileType(file) === 'docx';
  } catch {
    return false;
  }
}
