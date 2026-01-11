import { Severity, Category } from '../types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('pt-BR');
}

export function getSeverityColor(severity: Severity): string {
  switch (severity) {
    case 'critical': return '#dc3545';
    case 'major': return '#fd7e14';
    case 'minor': return '#ffc107';
    case 'info': return '#0dcaf0';
    default: return '#6c757d';
  }
}

export function getCategoryIcon(category: Category): string {
  switch (category) {
    case 'text': return '📝';
    case 'format': return '🎨';
    case 'structure': return '📐';
    case 'image': return '🖼️';
    case 'header': return '📄';
    case 'footer': return '📄';
    case 'table': return '📊';
    default: return '❓';
  }
}

export function exportToJSON(data: any, filename: string = 'report.json'): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToHTML(result: { issues: any[]; summary: any; metadata: any }, filename: string = 'report.html'): void {
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Comparação</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
    .summary-card { background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
    .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
    .summary-card .value { font-size: 32px; font-weight: bold; }
    .critical { color: #dc3545; }
    .major { color: #fd7e14; }
    .minor { color: #ffc107; }
    .info { color: #0dcaf0; }
    .issues { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .issue { border-left: 4px solid; padding: 15px; margin-bottom: 15px; background: #f9f9f9; border-radius: 4px; }
    .issue.critical { border-color: #dc3545; }
    .issue.major { border-color: #fd7e14; }
    .issue.minor { border-color: #ffc107; }
    .issue.info { border-color: #0dcaf0; }
    .issue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .issue-title { font-weight: bold; font-size: 16px; }
    .issue-meta { font-size: 12px; color: #666; }
    .issue-message { margin: 10px 0; }
    .issue-values { margin-top: 10px; padding: 10px; background: white; border-radius: 4px; }
    .value-row { margin: 5px 0; }
    .value-label { font-weight: bold; color: #333; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Relatório de Comparação de Documentos</h1>
    <p>Template: ${escapeHtml(result.metadata.templateName)}</p>
    <p>Documento: ${escapeHtml(result.metadata.documentName)}</p>
    <p>Gerado em: ${new Date(result.metadata.parsedAt).toLocaleString('pt-BR')}</p>
  </div>
  <div class="summary">
    <div class="summary-card"><h3>Crítico</h3><div class="value critical">${result.summary.critical}</div></div>
    <div class="summary-card"><h3>Major</h3><div class="value major">${result.summary.major}</div></div>
    <div class="summary-card"><h3>Minor</h3><div class="value minor">${result.summary.minor}</div></div>
    <div class="summary-card"><h3>Info</h3><div class="value info">${result.summary.info}</div></div>
    <div class="summary-card"><h3>Total</h3><div class="value">${result.summary.critical + result.summary.major + result.summary.minor + result.summary.info}</div></div>
  </div>
  <div class="issues">
    <h2>Issues Encontradas (${result.issues.length})</h2>
    ${result.issues.map(issue => `
      <div class="issue ${issue.severity}">
        <div class="issue-header">
          <span class="issue-title">${escapeHtml(issue.message)}</span>
          <div class="issue-meta">${issue.severity.toUpperCase()} • ${issue.category}</div>
        </div>
        <div class="issue-message">${escapeHtml(issue.location.section)}[${issue.location.blockIndex}]</div>
        ${issue.hint ? `<div class="issue-message"><em>${escapeHtml(issue.hint)}</em></div>` : ''}
        ${(issue.templateValue || issue.documentValue) ? `
          <div class="issue-values">
            ${issue.templateValue ? `<div class="value-row"><span class="value-label">Template:</span> ${escapeHtml(issue.templateValue)}</div>` : ''}
            ${issue.documentValue ? `<div class="value-row"><span class="value-label">Documento:</span> ${escapeHtml(issue.documentValue)}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  });
}

export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_TYPES = [
  'application/pdf',
  '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.docx',
  'image/png',
  'image/jpeg',
  '.png',
  '.jpg',
  '.jpeg'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];

export function validateFileType(file: File): { valid: boolean; error?: string } {
  // Extrair extensão do nome do arquivo
  const fileNameParts = file.name.split('.');
  if (fileNameParts.length < 2) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Aceitos: PDF, DOCX, PNG, JPG`
    };
  }
  
  const fileExtension = '.' + fileNameParts.pop()?.toLowerCase();
  const fileType = file.type.toLowerCase();
  
  // Verificar extensão (mais confiável que MIME type)
  const isValidExtension = ALLOWED_EXTENSIONS.includes(fileExtension);
  
  // Verificar tipo MIME (pode estar vazio em alguns navegadores)
  const isValidType = fileType && ALLOWED_TYPES.some(type => 
    type.toLowerCase() === fileType || 
    (type.startsWith('.') && type === fileExtension)
  );
  
  // Aceita se a extensão for válida OU se o tipo MIME for válido (e não estiver vazio)
  if (isValidExtension || isValidType) {
    return { valid: true };
  }
  
  return {
    valid: false,
    error: `Tipo de arquivo não permitido. Aceitos: PDF, DOCX, PNG, JPG`
  };
}

export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${formatFileSize(MAX_FILE_SIZE)}`
    };
  }
  return { valid: true };
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) {
    return typeValidation;
  }
  
  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) {
    return sizeValidation;
  }
  
  return { valid: true };
}
