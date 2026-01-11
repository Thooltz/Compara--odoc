import { CompareSummary } from '../types';
import { getSeverityColor } from '../lib/utils';

interface ReportSummaryProps {
  summary: CompareSummary;
}

export function ReportSummary({ summary }: ReportSummaryProps) {
  const cards = [
    { label: 'Crítico', value: summary.critical, severity: 'critical' as const },
    { label: 'Major', value: summary.major, severity: 'major' as const },
    { label: 'Minor', value: summary.minor, severity: 'minor' as const },
    { label: 'Info', value: summary.info, severity: 'info' as const },
    { label: 'Total', value: summary.critical + summary.major + summary.minor + summary.info, severity: null }
  ];

  return (
    <div className="report-summary">
      <h2>Resumo da Comparação</h2>
      <div className="summary-cards">
        {cards.map((card) => (
          <div key={card.label} className="summary-card">
            <div className="summary-card-label">{card.label}</div>
            <div
              className="summary-card-value"
              style={card.severity ? { color: getSeverityColor(card.severity) } : {}}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>
      <div className="summary-by-category">
        <h3>Por Categoria</h3>
        <div className="category-stats">
          {Object.entries(summary.byCategory).map(([category, count]) => (
            <div key={category} className="category-stat">
              <span className="category-name">{category}:</span>
              <span className="category-count">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
