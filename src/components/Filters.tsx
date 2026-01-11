import { Severity, Category } from '../types';

interface FiltersProps {
  selectedSeverities: Severity[];
  selectedCategories: Category[];
  onSeverityToggle: (severity: Severity) => void;
  onCategoryToggle: (category: Category) => void;
  onQuickFilter: (type: 'critical-major' | 'all') => void;
  searchText: string;
  onSearchChange: (text: string) => void;
}

export function Filters({
  selectedSeverities,
  selectedCategories,
  onSeverityToggle,
  onCategoryToggle,
  onQuickFilter,
  searchText,
  onSearchChange
}: FiltersProps) {
  const severities: Severity[] = ['critical', 'major', 'minor', 'info'];
  const categories: Category[] = ['text', 'format', 'structure', 'image', 'header', 'footer', 'table'];

  return (
    <div className="filters">
      <div className="filters-quick">
        <button className="filter-quick-btn" onClick={() => onQuickFilter('critical-major')}>
          Apenas Critical/Major
        </button>
        <button className="filter-quick-btn" onClick={() => onQuickFilter('all')}>
          Todas
        </button>
      </div>

      <div className="filter-group">
        <label className="filter-label">Buscar</label>
        <input
          type="text"
          className="filter-search"
          placeholder="Buscar por texto..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label className="filter-label">Severidade</label>
        <div className="filter-buttons">
          {severities.map((severity) => (
            <button
              key={severity}
              className={`filter-button ${selectedSeverities.includes(severity) ? 'active' : ''}`}
              onClick={() => onSeverityToggle(severity)}
            >
              {severity}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="filter-label">Categoria</label>
        <div className="filter-buttons">
          {categories.map((category) => (
            <button
              key={category}
              className={`filter-button ${selectedCategories.includes(category) ? 'active' : ''}`}
              onClick={() => onCategoryToggle(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
