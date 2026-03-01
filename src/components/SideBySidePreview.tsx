import { DocumentStructure, Issue } from '../types';
import { PdfPreview } from './PdfPreview';

interface SideBySidePreviewProps {
  template: DocumentStructure | null;
  document: DocumentStructure | null;
  templateFile?: File | null;
  documentFile?: File | null;
  selectedIssue: Issue | null;
  onIssueSelect?: (issue: Issue | null) => void;
  scrollSync?: boolean;
  showOnlyDifferences?: boolean;
  differences?: Issue[];
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export function SideBySidePreview({
  template,
  document,
  templateFile,
  documentFile,
  selectedIssue,
  onIssueSelect,
  scrollSync: _scrollSync = false,
  showOnlyDifferences = false,
  differences = [],
  currentPage = 1,
  onPageChange
}: SideBySidePreviewProps) {
  const renderParagraphs = (section: any, location: 'header' | 'body' | 'footer', _isTemplate: boolean) => {
    if (!section) return null;

    const paras = section.paragraphs || [];
    const diffIssues = differences.filter(d => d.location.section === location);
    const diffIndices = new Set(diffIssues.map(d => d.location.blockIndex));

    return paras.map((para: any, idx: number) => {
      const isHighlighted = selectedIssue?.location.blockIndex === idx && 
                            selectedIssue?.location.section === location;
      const hasDiff = diffIndices.has(idx);
      
      if (showOnlyDifferences && !hasDiff && !isHighlighted) return null;

      return (
        <div
          key={`${location}-${idx}`}
          className={`preview-paragraph ${isHighlighted ? 'highlighted' : ''} ${hasDiff ? 'has-diff' : ''}`}
          onClick={() => {
            if (onIssueSelect && isHighlighted) {
              onIssueSelect(null);
            }
          }}
          data-index={idx}
        >
          {para.runs.map((run: any, runIdx: number) => (
            <span
              key={runIdx}
              className={isHighlighted && selectedIssue?.location.runIndex === runIdx ? 'highlighted-run' : ''}
              style={{
                fontWeight: run.bold ? 'bold' : 'normal',
                fontStyle: run.italic ? 'italic' : 'normal',
                textDecoration: run.underline ? 'underline' : 'none',
                fontSize: run.fontSize ? `${run.fontSize}pt` : undefined,
                color: run.color || undefined
              }}
            >
              {run.text}
            </span>
          ))}
        </div>
      );
    });
  };

  return (
    <div className="side-by-side-preview">
      <div className="preview-panel">
        <div className="preview-header">
          <h3>Template {template?.fileType && `(${template.fileType.toUpperCase()})`}</h3>
        </div>
        <div className="preview-content" id="template-preview">
          {template ? (
            template.fileType === 'pdf' ? (
              <>
                <div className="pdf-page-controls">
                  <button 
                    className="btn-page-nav" 
                    onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                  >
                    ←
                  </button>
                  <span className="page-indicator">Página {currentPage} / {template.pageCount || 1}</span>
                  <button 
                    className="btn-page-nav" 
                    onClick={() => onPageChange && onPageChange(Math.min(template.pageCount || 1, currentPage + 1))}
                    disabled={currentPage >= (template.pageCount || 1)}
                  >
                    →
                  </button>
                </div>
                <PdfPreview 
                  file={templateFile || null} 
                  pageNumber={currentPage}
                  differences={differences}
                  selectedIssue={selectedIssue}
                  documentStructure={template}
                />
              </>
            ) : (
              <>
                {template.sections.header && (
                  <div className="preview-section">
                    <div className="section-label">Header</div>
                    {renderParagraphs(template.sections.header, 'header', true)}
                  </div>
                )}
                <div className="preview-section">
                  <div className="section-label">Body</div>
                  {renderParagraphs(template.sections.body, 'body', true)}
                </div>
                {template.sections.footer && (
                  <div className="preview-section">
                    <div className="section-label">Footer</div>
                    {renderParagraphs(template.sections.footer, 'footer', true)}
                  </div>
                )}
              </>
            )
          ) : (
            <div className="preview-empty">Nenhum template carregado</div>
          )}
        </div>
      </div>

      <div className="preview-panel">
        <div className="preview-header">
          <h3>Documento {document?.fileType && `(${document.fileType.toUpperCase()})`}</h3>
        </div>
        <div className="preview-content" id="document-preview">
          {document ? (
            document.fileType === 'pdf' ? (
              <>
                <div className="pdf-page-controls">
                  <button 
                    className="btn-page-nav" 
                    onClick={() => onPageChange && onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                  >
                    ←
                  </button>
                  <span className="page-indicator">Página {currentPage} / {document.pageCount || 1}</span>
                  <button 
                    className="btn-page-nav" 
                    onClick={() => onPageChange && onPageChange(Math.min(document.pageCount || 1, currentPage + 1))}
                    disabled={currentPage >= (document.pageCount || 1)}
                  >
                    →
                  </button>
                </div>
                <PdfPreview 
                  file={documentFile || null} 
                  pageNumber={currentPage}
                  differences={differences}
                  selectedIssue={selectedIssue}
                  documentStructure={document}
                />
              </>
            ) : (
              <>
                {document.sections.header && (
                  <div className="preview-section">
                    <div className="section-label">Header</div>
                    {renderParagraphs(document.sections.header, 'header', false)}
                  </div>
                )}
                <div className="preview-section">
                  <div className="section-label">Body</div>
                  {renderParagraphs(document.sections.body, 'body', false)}
                </div>
                {document.sections.footer && (
                  <div className="preview-section">
                    <div className="section-label">Footer</div>
                    {renderParagraphs(document.sections.footer, 'footer', false)}
                  </div>
                )}
              </>
            )
          ) : (
            <div className="preview-empty">Nenhum documento carregado</div>
          )}
        </div>
      </div>
    </div>
  );
}
