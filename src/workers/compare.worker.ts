import { parseDocument } from '../lib/documentParser';
import { compareDocuments } from '../lib/compareDocx';
import { CompareOptions } from '../types';

self.onmessage = async (event: MessageEvent<{ templateFile: File; docFile: File; options: CompareOptions }>) => {
  try {
    const { templateFile, docFile, options } = event.data;

    self.postMessage({ type: 'progress', message: 'Lendo template...' });
    const template = await parseDocument(templateFile);

    self.postMessage({ type: 'progress', message: 'Lendo documento...' });
    const document = await parseDocument(docFile);
    
    // Validar compatibilidade
    if (template.fileType !== document.fileType) {
      throw new Error('Não é possível comparar PDF com DOCX. Use arquivos do mesmo tipo.');
    }

    self.postMessage({ type: 'progress', message: 'Comparando documentos...' });
    const result = compareDocuments(template, document, options);

    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
};
