import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileDropzone } from '../components/FileDropzone';
import { DocxFile, CompareOptions, RigorLevel, ImageSensitivity } from '../types';
import { parseDocument } from '../lib/documentParser';
import { detectFileType } from '../lib/fileType';
import { validateFile } from '../lib/utils';

export function Home() {
  const [templateFile, setTemplateFile] = useState<DocxFile | null>(null);
  const [documentFile, setDocumentFile] = useState<DocxFile | null>(null);
  const [options, setOptions] = useState<CompareOptions>(() => {
    const saved = localStorage.getItem('compareOptions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback to default
      }
    }
    return {
      ignoreExtraSpaces: false,
      ignoreLineBreaks: false,
      ignoreCase: false,
      ignoreFontDifferences: false,
      rigorLevel: 'standard' as RigorLevel,
      imageSensitivity: 'medium' as ImageSensitivity,
      fontSizeTolerance: 2,
      spacingTolerance: 5,
      imageSizeTolerance: 10,
      requiredWords: [],
      forbiddenWords: []
    };
  });
  const navigate = useNavigate();

  const handleTemplateSelect = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const docxFile: DocxFile = {
      file,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      status: 'loading',
      fileType: detectFileType(file)
    };
    setTemplateFile(docxFile);

    try {
      await parseDocument(file);
      setTemplateFile({ ...docxFile, status: 'ok' });
    } catch (error) {
      setTemplateFile({
        ...docxFile,
        status: 'error',
        error: error instanceof Error ? error.message : 'Arquivo inválido ou corrompido'
      });
    }
  }, []);

  const handleDocumentSelect = useCallback(async (file: File) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const docxFile: DocxFile = {
      file,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified,
      status: 'loading',
      fileType: detectFileType(file)
    };
    setDocumentFile(docxFile);

    try {
      await parseDocument(file);
      setDocumentFile({ ...docxFile, status: 'ok' });
    } catch (error) {
      setDocumentFile({
        ...docxFile,
        status: 'error',
        error: error instanceof Error ? error.message : 'Arquivo inválido ou corrompido'
      });
    }
  }, []);

  const handleOpenCompare = useCallback(() => {
    if (!templateFile?.file || !documentFile?.file || templateFile.status !== 'ok' || documentFile.status !== 'ok') {
      return;
    }

    localStorage.setItem('compareOptions', JSON.stringify(options));
    sessionStorage.setItem('templateFile', JSON.stringify({ name: templateFile.name, size: templateFile.size }));
    sessionStorage.setItem('documentFile', JSON.stringify({ name: documentFile.name, size: documentFile.size }));
    
    navigate('/compare', { state: { templateFile: templateFile.file, documentFile: documentFile.file, options } });
  }, [templateFile, documentFile, options, navigate]);

  const canCompare = templateFile?.status === 'ok' && documentFile?.status === 'ok';

  return (
    <div className="page home-page">
      <div className="container">
        <div className="home-hero">
          <h1>📄 Comparador de Documentos</h1>
          <p className="subtitle">Compare documentos PDF ou DOCX lado a lado e identifique diferenças automaticamente</p>
          <div className="info-banner">
            <div className="info-banner-icon">🔒</div>
            <div className="info-banner-content">
              <strong>100% Local e Seguro</strong>
              <span>Todos os arquivos são processados no seu navegador. Nada é enviado para servidor.</span>
            </div>
          </div>
        </div>

        <div className="upload-section">
          <FileDropzone
            label="Template (Modelo Correto)"
            file={templateFile}
            onFileSelect={handleTemplateSelect}
          />
          <FileDropzone
            label="Documento para Validar"
            file={documentFile}
            onFileSelect={handleDocumentSelect}
          />
        </div>

        <div className="config-section">
          <h2>Configurações de Comparação</h2>
          
          <div className="config-group">
            <h3>Opções de Texto</h3>
            <label className="config-toggle">
              <input
                type="checkbox"
                checked={options.ignoreExtraSpaces}
                onChange={(e) => setOptions({ ...options, ignoreExtraSpaces: e.target.checked })}
              />
              <span>Ignorar espaços extras</span>
            </label>
            <label className="config-toggle">
              <input
                type="checkbox"
                checked={options.ignoreLineBreaks}
                onChange={(e) => setOptions({ ...options, ignoreLineBreaks: e.target.checked })}
              />
              <span>Ignorar quebras de linha</span>
            </label>
            <label className="config-toggle">
              <input
                type="checkbox"
                checked={options.ignoreCase}
                onChange={(e) => setOptions({ ...options, ignoreCase: e.target.checked })}
              />
              <span>Ignorar maiúsc/minúsc (case)</span>
            </label>
            <label className="config-toggle">
              <input
                type="checkbox"
                checked={options.ignoreFontDifferences}
                onChange={(e) => setOptions({ ...options, ignoreFontDifferences: e.target.checked })}
              />
              <span>Ignorar diferenças de fonte (opcional)</span>
            </label>
          </div>

          <div className="config-group">
            <h3>Nível de Rigor</h3>
            <select
              value={options.rigorLevel}
              onChange={(e) => setOptions({ ...options, rigorLevel: e.target.value as RigorLevel })}
              className="config-select"
            >
              <option value="light">Leve</option>
              <option value="standard">Padrão</option>
              <option value="strict">Rígido</option>
            </select>
          </div>

          <div className="config-group">
            <h3>Sensibilidade de Imagens/Logotipo</h3>
            <select
              value={options.imageSensitivity}
              onChange={(e) => setOptions({ ...options, imageSensitivity: e.target.value as ImageSensitivity })}
              className="config-select"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>

          <div className="config-group">
            <h3>Tolerâncias</h3>
            <label className="config-input">
              <span>Tolerância tamanho de fonte (pt):</span>
              <input
                type="number"
                value={options.fontSizeTolerance}
                onChange={(e) => setOptions({ ...options, fontSizeTolerance: Number(e.target.value) })}
                min="0"
                max="20"
              />
            </label>
            <label className="config-input">
              <span>Tolerância espaçamento (px):</span>
              <input
                type="number"
                value={options.spacingTolerance}
                onChange={(e) => setOptions({ ...options, spacingTolerance: Number(e.target.value) })}
                min="0"
                max="50"
              />
            </label>
            <label className="config-input">
              <span>Tolerância tamanho de imagem (%):</span>
              <input
                type="number"
                value={options.imageSizeTolerance}
                onChange={(e) => setOptions({ ...options, imageSizeTolerance: Number(e.target.value) })}
                min="0"
                max="100"
              />
            </label>
          </div>

          <div className="config-group">
            <h3>Palavras</h3>
            <label className="config-textarea">
              <span>Palavras obrigatórias (uma por linha):</span>
              <textarea
                value={options.requiredWords.join('\n')}
                onChange={(e) => setOptions({ ...options, requiredWords: e.target.value.split('\n').filter(w => w.trim()) })}
                rows={3}
                placeholder="palavra1&#10;palavra2"
              />
            </label>
            <label className="config-textarea">
              <span>Palavras proibidas (uma por linha):</span>
              <textarea
                value={options.forbiddenWords.join('\n')}
                onChange={(e) => setOptions({ ...options, forbiddenWords: e.target.value.split('\n').filter(w => w.trim()) })}
                rows={3}
                placeholder="palavra1&#10;palavra2"
              />
            </label>
          </div>
        </div>

        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={handleOpenCompare}
            disabled={!canCompare}
          >
            🔍 Iniciar Comparação
          </button>
        </div>
      </div>
    </div>
  );
}
