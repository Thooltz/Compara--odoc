import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ReportSummary } from '../components/ReportSummary';
import { IssueList } from '../components/IssueList';
import { IssueDetails } from '../components/IssueDetails';
import { Filters } from '../components/Filters';
import { exportToJSON, exportToHTML, copyToClipboard } from '../lib/utils';
import { CompareResult, Issue, Severity, Category } from '../types';

export function Report() {
  const navigate = useNavigate();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [selectedSeverities, setSelectedSeverities] = useState<Severity[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('compareResult');
    if (stored) {
      try {
        setResult(JSON.parse(stored));
      } catch {
        navigate('/');
      }
    } else {
      navigate('/');
    }
  }, [navigate]);

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

  const handleQuickFilter = useCallback((type: 'critical-major' | 'all') => {
    if (type === 'critical-major') {
      setSelectedSeverities(['critical', 'major']);
    } else {
      setSelectedSeverities([]);
      setSelectedCategories([]);
      setSearchText('');
    }
  }, []);

  const debouncedSearch = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setTimeout(() => debouncedSearch(text), 300);
  }, [debouncedSearch]);

  const handleExportJSON = useCallback(() => {
    if (result) {
      exportToJSON(result, 'comparison-report.json');
    }
  }, [result]);

  const handleExportHTML = useCallback(() => {
    if (result) {
      exportToHTML(result, 'comparison-report.html');
    }
  }, [result]);

  const handleCopySummary = useCallback(() => {
    if (!result) return;
    
    const summary = `
Relatório de Comparação
=======================

Template: ${result.metadata.templateName}
Documento: ${result.metadata.documentName}
Data: ${new Date(result.metadata.parsedAt).toLocaleString('pt-BR')}

Resumo:
- Critical: ${result.summary.critical}
- Major: ${result.summary.major}
- Minor: ${result.summary.minor}
- Info: ${result.summary.info}
- Total: ${result.summary.critical + result.summary.major + result.summary.minor + result.summary.info}

Issues por Categoria:
${Object.entries(result.summary.byCategory).map(([cat, count]) => `- ${cat}: ${count}`).join('\n')}
    `.trim();
    
    copyToClipboard(summary);
    alert('Resumo copiado para a área de transferência!');
  }, [result]);

  const handleDownloadDiagnostic = useCallback(() => {
    if (!result) return;
    
    const storedTemplate = sessionStorage.getItem('templateStructure');
    const storedDocument = sessionStorage.getItem('documentStructure');
    
    const diagnostic = {
      result,
      templateStructure: storedTemplate ? JSON.parse(storedTemplate) : null,
      documentStructure: storedDocument ? JSON.parse(storedDocument) : null,
      exportedAt: new Date().toISOString()
    };
    
    exportToJSON(diagnostic, 'diagnostic.json');
  }, [result]);

  const handleOpenInCompare = useCallback(() => {
    if (selectedIssue) {
      navigate('/compare', { state: { highlightIssue: selectedIssue.id } });
    }
  }, [selectedIssue, navigate]);

  if (!result) {
    return (
      <div className="page">
        <div className="container">
          <p>Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page report-page">
      <div className="container">
        <div className="report-header">
          <h1>Relatório de Comparação</h1>
          <Link to="/" className="btn btn-secondary">Nova Comparação</Link>
        </div>

        <ReportSummary summary={result.summary} />

        <div className="report-actions">
          <button className="btn btn-primary" onClick={handleExportJSON}>
            Exportar JSON
          </button>
          <button className="btn btn-primary" onClick={handleExportHTML}>
            Exportar HTML
          </button>
          <button className="btn btn-primary" onClick={handleCopySummary}>
            Copiar Resumo
          </button>
          <button className="btn btn-primary" onClick={handleDownloadDiagnostic}>
            Baixar Diagnóstico
          </button>
          {selectedIssue && (
            <button className="btn btn-primary" onClick={handleOpenInCompare}>
              Abrir no Compare
            </button>
          )}
        </div>

        <Filters
          selectedSeverities={selectedSeverities}
          selectedCategories={selectedCategories}
          onSeverityToggle={handleSeverityToggle}
          onCategoryToggle={handleCategoryToggle}
          onQuickFilter={handleQuickFilter}
          searchText={searchText}
          onSearchChange={handleSearchChange}
        />

        <div className="report-content">
          <div className="report-left">
            <IssueList
              issues={result.issues}
              selectedIssue={selectedIssue}
              onIssueSelect={setSelectedIssue}
              selectedSeverities={selectedSeverities}
              selectedCategories={selectedCategories}
              searchText={searchText}
            />
          </div>
          <div className="report-right">
            <IssueDetails issue={selectedIssue} />
          </div>
        </div>
      </div>
    </div>
  );
}
