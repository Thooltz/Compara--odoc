import { Issue, Severity, Category } from '../types';
import { getSeverityColor, getCategoryIcon } from '../lib/utils';

interface DiffPanelProps {
  issues: Issue[];
  selectedIssue: Issue | null;
  onIssueSelect: (issue: Issue) => void;
  selectedSeverities: Severity[];
  selectedCategories: Category[];
  searchText: string;
}

export function DiffPanel({
  issues,
  selectedIssue,
  onIssueSelect,
  selectedSeverities,
  selectedCategories,
  searchText
}: DiffPanelProps) {
  const filteredIssues = issues.filter(issue => {
    const severityMatch = selectedSeverities.length === 0 || selectedSeverities.includes(issue.severity);
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(issue.category);
    const searchMatch = searchText === '' || 
      issue.message.toLowerCase().includes(searchText.toLowerCase()) ||
      issue.hint?.toLowerCase().includes(searchText.toLowerCase());
    return severityMatch && categoryMatch && searchMatch;
  });

  return (
    <div className="diff-panel">
      <h3>Diferenças ({filteredIssues.length})</h3>
      {filteredIssues.length === 0 ? (
        <div className="diff-panel-empty">Nenhuma diferença encontrada</div>
      ) : (
        <div className="diff-items">
          {filteredIssues.map((issue, index) => {
            const isSelected = selectedIssue?.id === issue.id;
            const issueNumber = index + 1;
            return (
              <div
                key={issue.id}
                className={`diff-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onIssueSelect(issue)}
                style={{
                  borderLeftColor: getSeverityColor(issue.severity)
                }}
              >
                <div className="diff-item-header">
                  <span className="diff-item-number">{issueNumber}</span>
                  <span className="diff-item-icon">{getCategoryIcon(issue.category)}</span>
                  <span className="diff-item-message">{issue.message}</span>
                  <span className={`diff-item-severity ${issue.severity}`}>{issue.severity}</span>
                </div>
              <div className="diff-item-path">
                {issue.location.section}[{issue.location.blockIndex}]
              </div>
              {issue.hint && (
                <div className="diff-item-hint">{issue.hint}</div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
