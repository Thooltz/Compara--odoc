import { detectFileType } from './fileType';
import { parseDocx } from './docxParser';
import { parsePdf } from './pdfParser';
import { DocumentStructure } from '../types';

export async function parseDocument(file: File): Promise<DocumentStructure> {
  const fileType = detectFileType(file);

  if (fileType === 'pdf') {
    return await parsePdf(file);
  } else if (fileType === 'docx') {
    return await parseDocx(file);
  } else {
    throw new Error('Tipo de arquivo não suportado. Use PDF ou DOCX.');
  }
}
