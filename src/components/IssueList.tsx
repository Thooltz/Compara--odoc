import { Issue, Severity, Category } from '../types';
import { getSeverityColor, getCategoryIcon } from '../lib/utils';

interface IssueListProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onIssueSelect: (issue: Issue) => void;
  selectedSeverities: Severity[];
  selectedCategories: Category[];
  searchText: string;
}

export function IssueList({
  issues,
  selectedIssue,
  onIssueSelect,
  selectedSeverities,
  selectedCategories,
  searchText
}: IssueListProps) {
  const filteredIssues = issues.filter(issue => {
    const severityMatch = selectedSeverities.length === 0 || selectedSeverities.includes(issue.severity);
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(issue.category);
    const searchMatch = searchText === '' || 
      issue.message.toLowerCase().includes(searchText.toLowerCase()) ||
      issue.hint?.toLowerCase().includes(searchText.toLowerCase());
    return severityMatch && categoryMatch && searchMatch;
  });

  return (
    <div className="issue-list">
      <h3>Issues Encontradas ({filteredIssues.length})</h3>
      {filteredIssues.length === 0 ? (
        <div className="issue-list-empty">Nenhuma issue encontrada com os filtros selecionados</div>
      ) : (
        <div className="issue-items">
          {filteredIssues.map((issue) => (
            <div
              key={issue.id}
              className={`issue-item ${selectedIssue?.id === issue.id ? 'selected' : ''}`}
              onClick={() => onIssueSelect(issue)}
              style={{
                borderLeftColor: getSeverityColor(issue.severity)
              }}
            >
              <div className="issue-item-header">
                <span className="issue-item-icon">{getCategoryIcon(issue.category)}</span>
                <span className="issue-item-message">{issue.message}</span>
                <span className="issue-item-severity">{issue.severity}</span>
              </div>
              <div className="issue-item-path">
                {issue.location.section}[{issue.location.blockIndex}]
              </div>
              {issue.hint && (
                <div className="issue-item-hint">{issue.hint}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
