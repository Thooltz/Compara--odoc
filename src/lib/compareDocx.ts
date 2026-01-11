import { DocumentStructure, Issue, CompareResult, CompareSummary, CompareOptions, Location, Paragraph, ImageInfo } from '../types';
import { generateId } from './utils';
import { getParagraphText, compareRuns, findBestMatch } from './normalize';
import { hasSignificantDiff } from './diff';

export function compareDocuments(
  template: DocumentStructure,
  document: DocumentStructure,
  options: CompareOptions
): CompareResult {
  const issues: Issue[] = [];

  compareStructure(template, document, options, issues);
  compareSection('header', template.sections.header, document.sections.header, options, issues);
  compareSection('body', template.sections.body, document.sections.body, options, issues);
  compareSection('footer', template.sections.footer, document.sections.footer, options, issues);
  compareImages(template, document, options, issues);
  checkRequiredWords(template, document, options, issues);
  checkForbiddenWords(template, document, options, issues);

  const summary = generateSummary(issues);

  const templateExt = template.fileType === 'pdf' ? '.pdf' : '.docx';
  const documentExt = document.fileType === 'pdf' ? '.pdf' : '.docx';
  
  return {
    summary,
    issues,
    metadata: {
      templateName: `template${templateExt}`,
      documentName: `document${documentExt}`,
      parsedAt: new Date().toISOString(),
      options
    }
  };
}

function compareStructure(
  template: DocumentStructure,
  document: DocumentStructure,
  options: CompareOptions,
  issues: Issue[]
): void {
  const templateHasHeader = !!template.sections.header;
  const documentHasHeader = !!document.sections.header;
  const templateHasFooter = !!template.sections.footer;
  const documentHasFooter = !!document.sections.footer;

  if (templateHasHeader && !documentHasHeader) {
    issues.push(createIssue('critical', 'header', { section: 'header', blockIndex: 0 }, 'Header ausente no documento', 'O template possui header, mas o documento não possui'));
  }

  if (templateHasFooter && !documentHasFooter) {
    issues.push(createIssue('critical', 'footer', { section: 'footer', blockIndex: 0 }, 'Footer ausente no documento', 'O template possui footer, mas o documento não possui'));
  }
}

function compareSection(
  location: 'header' | 'body' | 'footer',
  templateSection: any,
  documentSection: any,
  options: CompareOptions,
  issues: Issue[]
): void {
  if (!templateSection && !documentSection) return;

  if (!templateSection) {
    issues.push(createIssue('info', location === 'header' ? 'header' : location === 'footer' ? 'footer' : 'structure', { section: location, blockIndex: 0 }, `Seção ${location} presente no documento mas não no template`));
    return;
  }

  if (!documentSection) {
    const severity = options.rigorLevel === 'strict' ? 'major' : 'minor';
    issues.push(createIssue(severity, location === 'header' ? 'header' : location === 'footer' ? 'footer' : 'structure', { section: location, blockIndex: 0 }, `Seção ${location} ausente no documento`));
    return;
  }

  compareParagraphs(location, templateSection.paragraphs || [], documentSection.paragraphs || [], options, issues);
  compareTables(location, templateSection.tables || [], documentSection.tables || [], options, issues);
}

function compareParagraphs(
  location: 'header' | 'body' | 'footer',
  templateParas: Paragraph[],
  documentParas: Paragraph[],
  options: CompareOptions,
  issues: Issue[]
): void {
  const templateCount = templateParas.length;
  const documentCount = documentParas.length;

  if (templateCount !== documentCount) {
    const severity = options.rigorLevel === 'strict' ? 'major' : 'minor';
    issues.push(createIssue(severity, 'structure', { section: location, blockIndex: 0 }, `Quantidade de parágrafos diferente em ${location}`, undefined, `${templateCount} parágrafos`, `${documentCount} parágrafos`));
  }

  const minCount = Math.min(templateCount, documentCount);
  const usedIndices = new Set<number>();

  for (let i = 0; i < templateParas.length; i++) {
    const templatePara = templateParas[i];
    let documentPara: Paragraph | null = null;
    let documentIndex = i;

    if (i < documentParas.length) {
      documentPara = documentParas[i];
      usedIndices.add(i);
    } else {
      const match = findBestMatch(templatePara, documentParas, options, 0.7);
      if (match && !usedIndices.has(match.index)) {
        documentPara = documentParas[match.index];
        documentIndex = match.index;
        usedIndices.add(match.index);
      }
    }

    if (!documentPara) {
      const severity = options.rigorLevel === 'strict' ? 'major' : 'minor';
      issues.push(createIssue(severity, 'text', { section: location, blockIndex: i }, `Parágrafo ${i + 1} ausente no documento`));
      continue;
    }

    const locationObj: Location = { section: location, blockIndex: documentIndex };

    if (hasSignificantDiff(templatePara, documentPara, options)) {
      const templateText = getParagraphText(templatePara, options);
      const documentText = getParagraphText(documentPara, options);
      issues.push(createIssue('critical', 'text', locationObj, `Texto divergente no parágrafo ${i + 1}`, undefined, templateText.substring(0, 100), documentText.substring(0, 100)));
    }

    if (templatePara.alignment !== documentPara.alignment) {
      const severity = options.rigorLevel === 'strict' ? 'minor' : 'info';
      issues.push(createIssue(severity, 'format', { ...locationObj, runIndex: 0 }, `Alinhamento diferente no parágrafo ${i + 1}`, undefined, templatePara.alignment || 'left', documentPara.alignment || 'left'));
    }

    if (templatePara.styleId !== documentPara.styleId) {
      const isHeading = templatePara.styleId?.startsWith('Heading') || documentPara.styleId?.startsWith('Heading');
      const severity = isHeading ? 'major' : (options.rigorLevel === 'strict' ? 'minor' : 'info');
      issues.push(createIssue(severity, 'format', locationObj, `Estilo diferente no parágrafo ${i + 1}`, undefined, templatePara.styleId || 'normal', documentPara.styleId || 'normal'));
    }

    const templateRuns = templatePara.runs;
    const documentRuns = documentPara.runs;

    if (templateRuns.length !== documentRuns.length) {
      issues.push(createIssue('minor', 'format', locationObj, `Quantidade de runs diferente no parágrafo ${i + 1}`, undefined, `${templateRuns.length} runs`, `${documentRuns.length} runs`));
    }

    const minRuns = Math.min(templateRuns.length, documentRuns.length);
    for (let j = 0; j < minRuns; j++) {
      const templateRun = templateRuns[j];
      const documentRun = documentRuns[j];

      if (!compareRuns(templateRun, documentRun, options)) {
        if (templateRun.bold !== documentRun.bold) {
          issues.push(createIssue('minor', 'format', { ...locationObj, runIndex: j }, `Formatação negrito diferente no parágrafo ${i + 1}, run ${j + 1}`));
        }
        if (templateRun.italic !== documentRun.italic) {
          issues.push(createIssue('minor', 'format', { ...locationObj, runIndex: j }, `Formatação itálico diferente no parágrafo ${i + 1}, run ${j + 1}`));
        }
        if (templateRun.underline !== documentRun.underline) {
          issues.push(createIssue('minor', 'format', { ...locationObj, runIndex: j }, `Formatação sublinhado diferente no parágrafo ${i + 1}, run ${j + 1}`));
        }
        if (templateRun.fontSize !== documentRun.fontSize) {
          const diff = Math.abs((templateRun.fontSize || 12) - (documentRun.fontSize || 12));
          const severity = diff > options.fontSizeTolerance ? 'minor' : 'info';
          issues.push(createIssue(severity, 'format', { ...locationObj, runIndex: j }, `Tamanho da fonte diferente no parágrafo ${i + 1}, run ${j + 1}`, undefined, templateRun.fontSize?.toString() || 'padrão', documentRun.fontSize?.toString() || 'padrão'));
        }
        if (templateRun.color !== documentRun.color) {
          issues.push(createIssue('info', 'format', { ...locationObj, runIndex: j }, `Cor da fonte diferente no parágrafo ${i + 1}, run ${j + 1}`));
        }
      }
    }
  }
}

function compareTables(
  location: 'header' | 'body' | 'footer',
  templateTables: any[],
  documentTables: any[],
  options: CompareOptions,
  issues: Issue[]
): void {
  const templateCount = templateTables.length;
  const documentCount = documentTables.length;

  if (templateCount !== documentCount) {
    issues.push(createIssue('major', 'table', { section: location, blockIndex: 0 }, `Quantidade de tabelas diferente em ${location}`, undefined, `${templateCount} tabelas`, `${documentCount} tabelas`));
  }

  const minCount = Math.min(templateCount, documentCount);
  for (let i = 0; i < minCount; i++) {
    const templateTable = templateTables[i];
    const documentTable = documentTables[i];
    const locationObj: Location = { section: location, tableIndex: i, blockIndex: i };

    if (templateTable.rows !== documentTable.rows) {
      issues.push(createIssue('major', 'table', locationObj, `Número de linhas diferente na tabela ${i + 1}`, undefined, `${templateTable.rows} linhas`, `${documentTable.rows} linhas`));
    }

    if (templateTable.cols !== documentTable.cols) {
      issues.push(createIssue('major', 'table', locationObj, `Número de colunas diferente na tabela ${i + 1}`, undefined, `${templateTable.cols} colunas`, `${documentTable.cols} colunas`));
    }
  }
}

function compareImages(
  template: DocumentStructure,
  document: DocumentStructure,
  options: CompareOptions,
  issues: Issue[]
): void {
  const templateHeaderImages = template.sections.header?.images || [];
  const documentHeaderImages = document.sections.header?.images || [];
  const templateMainLogo = templateHeaderImages.find(img => img.isMainLogo) || templateHeaderImages[0];
  const documentMainLogo = documentHeaderImages.find(img => img.isMainLogo) || documentHeaderImages[0];

  if (templateMainLogo && !documentMainLogo) {
    issues.push(createIssue('critical', 'image', { section: 'header', blockIndex: 0 }, 'Logotipo obrigatório ausente no header do documento', 'O template possui logo no header, mas o documento não possui'));
  }

  if (templateMainLogo && documentMainLogo) {
    if (templateMainLogo.location !== documentMainLogo.location) {
      const severity = options.imageSensitivity === 'high' ? 'critical' : 'major';
      issues.push(createIssue(severity, 'image', { section: documentMainLogo.location, blockIndex: 0 }, 'Logotipo mudou de seção', `Template: ${templateMainLogo.location}, Documento: ${documentMainLogo.location}`));
    }

    if (templateMainLogo.width && documentMainLogo.width) {
      const sizeDiff = Math.abs(templateMainLogo.width - documentMainLogo.width) / templateMainLogo.width;
      const threshold = options.imageSizeTolerance / 100;
      if (sizeDiff > threshold) {
        const severity = sizeDiff > threshold * 2 ? 'major' : (options.imageSensitivity === 'high' ? 'major' : 'minor');
        issues.push(createIssue(severity, 'image', { section: 'header', blockIndex: 0 }, 'Tamanho do logotipo muito diferente', `Diferença de ${(sizeDiff * 100).toFixed(0)}%`));
      }
    }
  }

  const templateImages: ImageInfo[] = [
    ...templateHeaderImages,
    ...(template.sections.body?.images || []),
    ...(template.sections.footer?.images || [])
  ];

  const documentImages: ImageInfo[] = [
    ...documentHeaderImages,
    ...(document.sections.body?.images || []),
    ...(document.sections.footer?.images || [])
  ];

  if (templateImages.length !== documentImages.length) {
    const severity = options.imageSensitivity === 'high' ? 'major' : 'minor';
    issues.push(createIssue(severity, 'image', { section: 'body', blockIndex: 0 }, 'Quantidade de imagens diferente', undefined, `${templateImages.length} imagens`, `${documentImages.length} imagens`));
  }
}

function checkRequiredWords(
  template: DocumentStructure,
  document: DocumentStructure,
  options: CompareOptions,
  issues: Issue[]
): void {
  if (options.requiredWords.length === 0) return;

  const getAllText = (struct: DocumentStructure): string => {
    let text = '';
    if (struct.sections.header) {
      struct.sections.header.paragraphs.forEach(p => text += getParagraphText(p, options) + ' ');
    }
    struct.sections.body.paragraphs.forEach(p => text += getParagraphText(p, options) + ' ');
    if (struct.sections.footer) {
      struct.sections.footer.paragraphs.forEach(p => text += getParagraphText(p, options) + ' ');
    }
    return text.toLowerCase();
  };

  const documentText = getAllText(document);
  for (const word of options.requiredWords) {
    const normalizedWord = options.ignoreCase ? word.toLowerCase() : word;
    if (!documentText.includes(normalizedWord)) {
      issues.push(createIssue('critical', 'text', { section: 'body', blockIndex: 0 }, `Palavra obrigatória ausente: "${word}"`));
    }
  }
}

function checkForbiddenWords(
  template: DocumentStructure,
  document: DocumentStructure,
  options: CompareOptions,
  issues: Issue[]
): void {
  if (options.forbiddenWords.length === 0) return;

  const getAllText = (struct: DocumentStructure): string => {
    let text = '';
    if (struct.sections.header) {
      struct.sections.header.paragraphs.forEach(p => text += getParagraphText(p, options) + ' ');
    }
    struct.sections.body.paragraphs.forEach(p => text += getParagraphText(p, options) + ' ');
    if (struct.sections.footer) {
      struct.sections.footer.paragraphs.forEach(p => text += getParagraphText(p, options) + ' ');
    }
    return text.toLowerCase();
  };

  const documentText = getAllText(document);
  for (const word of options.forbiddenWords) {
    const normalizedWord = options.ignoreCase ? word.toLowerCase() : word;
    if (documentText.includes(normalizedWord)) {
      issues.push(createIssue('critical', 'text', { section: 'body', blockIndex: 0 }, `Palavra proibida encontrada: "${word}"`));
    }
  }
}

function createIssue(
  severity: 'critical' | 'major' | 'minor' | 'info',
  category: 'text' | 'format' | 'structure' | 'image' | 'header' | 'footer' | 'table',
  location: Location,
  message: string,
  hint?: string,
  templateValue?: string,
  documentValue?: string
): Issue {
  return {
    id: generateId(),
    severity,
    category,
    location,
    message,
    hint,
    templateValue,
    documentValue
  };
}

function generateSummary(issues: Issue[]): CompareSummary {
  const summary: CompareSummary = {
    critical: 0,
    major: 0,
    minor: 0,
    info: 0,
    byCategory: {
      text: 0,
      format: 0,
      structure: 0,
      image: 0,
      header: 0,
      footer: 0,
      table: 0
    }
  };

  for (const issue of issues) {
    summary[issue.severity]++;
    summary.byCategory[issue.category]++;
  }

  return summary;
}
