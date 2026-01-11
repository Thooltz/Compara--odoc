import { CompareSummary } from '../types';
import { getSeverityColor } from '../lib/utils';

interface SummaryBarProps {
  summary: CompareSummary;
}

export function SummaryBar({ summary }: SummaryBarProps) {
  const cards = [
    { label: 'Critical', value: summary.critical, severity: 'critical' as const },
    { label: 'Major', value: summary.major, severity: 'major' as const },
    { label: 'Minor', value: summary.minor, severity: 'minor' as const },
    { label: 'Info', value: summary.info, severity: 'info' as const }
  ];

  return (
    <div className="summary-bar">
      {cards.map((card) => (
        <div key={card.label} className="summary-bar-item">
          <div className="summary-bar-label">{card.label}</div>
          <div
            className="summary-bar-value"
            style={{ color: getSeverityColor(card.severity) }}
          >
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
