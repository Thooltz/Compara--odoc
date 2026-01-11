import { Issue } from '../types';
import { getSeverityColor, getCategoryIcon } from '../lib/utils';

interface IssueDetailsProps {
  issue: Issue | null;
}

export function IssueDetails({ issue }: IssueDetailsProps) {
  if (!issue) {
    return (
      <div className="issue-details">
        <div className="issue-details-empty">
          Selecione uma issue para ver os detalhes
        </div>
      </div>
    );
  }

  return (
    <div className="issue-details">
      <div className="issue-details-header">
        <span className="issue-details-icon">{getCategoryIcon(issue.category)}</span>
        <div>
          <h3>{issue.message}</h3>
          <div className="issue-details-meta">
            <span
              className="issue-details-severity"
              style={{ color: getSeverityColor(issue.severity) }}
            >
              {issue.severity.toUpperCase()}
            </span>
            <span className="issue-details-category">{issue.category}</span>
          </div>
        </div>
      </div>

      <div className="issue-details-content">
        <div className="issue-details-section">
          <label>Localização:</label>
          <code>{issue.location.section}[{issue.location.blockIndex}]{issue.location.runIndex !== undefined ? ` run[${issue.location.runIndex}]` : ''}</code>
        </div>

        {issue.hint && (
          <div className="issue-details-section">
            <label>Dica:</label>
            <p>{issue.hint}</p>
          </div>
        )}

        {(issue.templateValue || issue.documentValue) && (
          <div className="issue-details-section">
            <label>Valores:</label>
            <div className="issue-details-values">
              {issue.templateValue && (
                <div className="issue-value">
                  <div className="issue-value-label">Template:</div>
                  <div className="issue-value-content">{issue.templateValue}</div>
                </div>
              )}
              {issue.documentValue && (
                <div className="issue-value">
                  <div className="issue-value-label">Documento:</div>
                  <div className="issue-value-content">{issue.documentValue}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
