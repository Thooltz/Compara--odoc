import { CompareResult, CompareOptions, DocumentStructure } from '../types';
import { compareDocuments } from '../lib/compareDocx';

export interface CompareService {
  compareLocal(templateStructure: DocumentStructure, documentStructure: DocumentStructure, options: CompareOptions): Promise<CompareResult>;
  compareRemote(templateFile: File, docFile: File, options: CompareOptions): Promise<CompareResult>;
}

class CompareServiceImpl implements CompareService {
  async compareLocal(templateStructure: DocumentStructure, documentStructure: DocumentStructure, options: CompareOptions): Promise<CompareResult> {
    // Fazer comparação diretamente sem worker para evitar problemas de serialização
    return Promise.resolve(compareDocuments(templateStructure, documentStructure, options));
  }

  async compareRemote(templateFile: File, docFile: File, options: CompareOptions): Promise<CompareResult> {
    const formData = new FormData();
    formData.append('template', templateFile);
    formData.append('document', docFile);
    formData.append('options', JSON.stringify(options));

    const response = await fetch('/api/compare', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Erro ao comparar documentos');
    }

    return await response.json();
  }
}

export const compareService = new CompareServiceImpl();
