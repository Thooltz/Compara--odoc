import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SideBySidePreview } from '../components/SideBySidePreview';
import { DiffPanel } from '../components/DiffPanel';
import { SummaryBar } from '../components/SummaryBar';
import { Filters } from '../components/Filters';
import { compareService } from '../services/compareService';
import { parseDocument } from '../lib/documentParser';
import { DocumentStructure, CompareResult, Issue, Severity, Category, CompareOptions } from '../types';

type Status = 'ready' | 'reading' | 'comparing' | 'completed' | 'error';

export function Compare() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('ready');
  const [templateStructure, setTemplateStructure] = useState<DocumentStructure | null>(null);
  const [documentStructure, setDocumentStructure] = useState<DocumentStructure | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [scrollSync, setScrollSync] = useState(true);
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);
  const [currentIssueIndex, setCurrentIssueIndex] = useState(-1);
  const templatePreviewRef = useRef<HTMLDivElement>(null);
  const documentPreviewRef = useRef<HTMLDivElement>(null);

  const startComparison = useCallback(async (templateFile: File, documentFile: File, options: CompareOptions) => {
    setStatus('reading');
    try {
      const template = await parseDocument(templateFile);
      const document = await parseDocument(documentFile);
      
      // Validar compatibilidade de tipos
      if (template.fileType !== document.fileType) {
        throw new Error('Não é possível comparar PDF com DOCX. Use arquivos do mesmo tipo.');
      }
      
      setTemplateStructure(template);
      setDocumentStructure(document);

      setStatus('comparing');
      // Passar estruturas já parseadas para o serviço
      const comparisonResult = await compareService.compareLocal(template, document, options);
      setResult(comparisonResult);
      setStatus('completed');
      
      sessionStorage.setItem('compareResult', JSON.stringify(comparisonResult));
      sessionStorage.setItem('templateStructure', JSON.stringify(template));
      sessionStorage.setItem('documentStructure', JSON.stringify(document));
    } catch (error) {
      console.error('Erro na comparação:', error);
      setStatus('error');
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      alert('Erro ao comparar: ' + errorMessage);
    }
  }, []);

  useEffect(() => {
    const state = location.state as { templateFile: File; documentFile: File; options: CompareOptions } | null;
    if (!state || !state.templateFile || !state.documentFile) {
      navigate('/');
      return;
    }

    const { templateFile, documentFile, options } = state;
    setTemplateFile(templateFile);
    setDocumentFile(documentFile);
    startComparison(templateFile, documentFile, options);
  }, [location, navigate, startComparison]);

  const handleSeverityToggle = useCallback((severity: Severity) => {
    setSelectedSeverities(prev =>
      prev.includes(severity)
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    );
  }, []);

  const handleCategoryToggle = useCallback((category: Category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleQuickFilter = useCallback((type: 'critical-major' | 'all') => {
    if (type === 'critical-major') {
      setSelectedSeverities(['critical', 'major']);
    } else {
      setSelectedSeverities([]);
      setSelectedCategories([]);
      setSearchInput('');
      setSearchText('');
    }
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchInput(text);
  }, []);

  const filteredIssues = result?.issues.filter(issue => {
    const severityMatch = selectedSeverities.length === 0 || selectedSeverities.includes(issue.severity);
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(issue.category);
    const searchMatch = searchText === '' || 
      issue.message.toLowerCase().includes(searchText.toLowerCase()) ||
      issue.hint?.toLowerCase().includes(searchText.toLowerCase());
    return severityMatch && categoryMatch && searchMatch;
  }) || [];

  const navigateToIssue = useCallback((direction: 'next' | 'prev') => {
    if (filteredIssues.length === 0) return;
    
    let newIndex = currentIssueIndex;
    if (direction === 'next') {
      newIndex = (currentIssueIndex + 1) % filteredIssues.length;
    } else {
      newIndex = currentIssueIndex <= 0 ? filteredIssues.length - 1 : currentIssueIndex - 1;
    }
    
    setCurrentIssueIndex(newIndex);
    const issue = filteredIssues[newIndex];
    setSelectedIssue(issue);
    
    // Scroll to element - usar window.setTimeout para garantir que o DOM está pronto
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        const element = document.querySelector(`[data-index="${issue.location.blockIndex}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [filteredIssues, currentIssueIndex]);

  useEffect(() => {
    if (scrollSync && templatePreviewRef.current && documentPreviewRef.current) {
      const templateEl = templatePreviewRef.current;
      const documentEl = documentPreviewRef.current;
      
      const handleScroll = (source: 'template' | 'document') => {
        if (source === 'template') {
          documentEl.scrollTop = templateEl.scrollTop;
        } else {
          templateEl.scrollTop = documentEl.scrollTop;
        }
      };

      const templateScrollHandler = () => handleScroll('template');
      const documentScrollHandler = () => handleScroll('document');

      templateEl.addEventListener('scroll', templateScrollHandler);
      documentEl.addEventListener('scroll', documentScrollHandler);

      return () => {
        templateEl.removeEventListener('scroll', templateScrollHandler);
        documentEl.removeEventListener('scroll', documentScrollHandler);
      };
    }
  }, [scrollSync]);

  return (
    <div className="page compare-page">
      <div className="container">
        <div className="compare-header">
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Voltar</button>
          <div className="compare-status">
            Status: <span className={`status-${status}`}>{status}</span>
          </div>
          {result && <SummaryBar summary={result.summary} />}
          <button
            className="btn btn-primary"
            onClick={() => navigate('/report')}
            disabled={status !== 'completed'}
          >
            Ver Relatório
          </button>
        </div>

        {status === 'error' && (
          <div className="error-message">
            Erro ao processar documentos. Verifique se os arquivos são válidos.
            <br />
            <button className="btn btn-secondary" onClick={() => navigate('/')} style={{ marginTop: '1rem' }}>
              Voltar para Home
            </button>
          </div>
        )}

        {status === 'ready' && (
          <div className="loading-message">
            Preparando comparação...
          </div>
        )}

        {status === 'completed' && result && templateStructure && documentStructure && (
          <>
            <div className="compare-controls">
              <label className="control-toggle">
                <input
                  type="checkbox"
                  checked={scrollSync}
                  onChange={(e) => setScrollSync(e.target.checked)}
                />
                <span>Scroll sincronizado</span>
              </label>
              <label className="control-toggle">
                <input
                  type="checkbox"
                  checked={showOnlyDifferences}
                  onChange={(e) => setShowOnlyDifferences(e.target.checked)}
                />
                <span>Mostrar só diferenças</span>
              </label>
              <div className="control-buttons">
                <button className="btn btn-small" onClick={() => navigateToIssue('prev')}>
                  ← Anterior
                </button>
                <button className="btn btn-small" onClick={() => navigateToIssue('next')}>
                  Próxima →
                </button>
              </div>
            </div>

            <div className="compare-layout">
              <div className="compare-preview-column" ref={templatePreviewRef}>
                <SideBySidePreview
                  template={templateStructure}
                  document={null}
                  templateFile={templateFile}
                  selectedIssue={selectedIssue}
                  onIssueSelect={setSelectedIssue}
                  scrollSync={scrollSync}
                  showOnlyDifferences={showOnlyDifferences}
                  differences={filteredIssues}
                />
              </div>
              <div className="compare-preview-column" ref={documentPreviewRef}>
                <SideBySidePreview
                  template={null}
                  document={documentStructure}
                  documentFile={documentFile}
                  selectedIssue={selectedIssue}
                  onIssueSelect={setSelectedIssue}
                  scrollSync={scrollSync}
                  showOnlyDifferences={showOnlyDifferences}
                  differences={filteredIssues}
                />
              </div>
              <div className="compare-diff-column">
                <Filters
                  selectedSeverities={selectedSeverities}
                  selectedCategories={selectedCategories}
                  onSeverityToggle={handleSeverityToggle}
                  onCategoryToggle={handleCategoryToggle}
                  onQuickFilter={handleQuickFilter}
                  searchText={searchInput}
                  onSearchChange={handleSearchChange}
                />
                <DiffPanel
                  issues={result.issues || []}
                  selectedIssue={selectedIssue}
                  onIssueSelect={setSelectedIssue}
                  selectedSeverities={selectedSeverities}
                  selectedCategories={selectedCategories}
                  searchText={searchText}
                />
              </div>
            </div>
          </>
        )}

        {(status === 'reading' || status === 'comparing') && (
          <div className="loading-message">
            {status === 'reading' ? 'Lendo documentos...' : 'Comparando documentos...'}
          </div>
        )}
      </div>
    </div>
  );
}
