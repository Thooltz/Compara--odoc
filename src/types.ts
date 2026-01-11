export type Section = 'header' | 'body' | 'footer';
export type Severity = 'critical' | 'major' | 'minor' | 'info';
export type Category = 'text' | 'format' | 'structure' | 'image' | 'header' | 'footer' | 'table';
export type RigorLevel = 'light' | 'standard' | 'strict';
export type ImageSensitivity = 'low' | 'medium' | 'high';
export type FileType = 'pdf' | 'docx';

export interface Location {
  section: Section;
  blockIndex: number;
  runIndex?: number;
  tableIndex?: number;
  pageNumber?: number; // Para PDF
}

export interface Issue {
  id: string;
  severity: Severity;
  category: Category;
  location: Location;
  message: string;
  templateValue?: string;
  documentValue?: string;
  hint?: string;
}

export interface CompareSummary {
  critical: number;
  major: number;
  minor: number;
  info: number;
  byCategory: Record<Category, number>;
}

export interface CompareOptions {
  ignoreExtraSpaces: boolean;
  ignoreLineBreaks: boolean;
  ignoreCase: boolean;
  ignoreFontDifferences: boolean;
  rigorLevel: RigorLevel;
  imageSensitivity: ImageSensitivity;
  fontSizeTolerance: number;
  spacingTolerance: number;
  imageSizeTolerance: number;
  requiredWords: string[];
  forbiddenWords: string[];
}

export interface CompareResult {
  summary: CompareSummary;
  issues: Issue[];
  metadata: {
    templateName: string;
    documentName: string;
    parsedAt: string;
    options: CompareOptions;
  };
}

export interface ParagraphRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  highlight?: string;
}

export interface Paragraph {
  runs: ParagraphRun[];
  alignment?: 'left' | 'center' | 'right' | 'justify';
  styleId?: string;
  spacing?: {
    before?: number;
    after?: number;
    line?: number;
  };
  indent?: {
    left?: number;
    right?: number;
  };
  index: number;
}

export interface Table {
  rows: number;
  cols: number;
  index: number;
  content?: string[][];
}

export interface ImageInfo {
  relationId: string;
  location: Section;
  index: number;
  width?: number;
  height?: number;
  name?: string;
  isMainLogo?: boolean;
}

export interface DocumentStructure {
  fileType: FileType;
  pageCount?: number; // Para PDF
  sections: {
    header?: {
      paragraphs: Paragraph[];
      tables: Table[];
      images: ImageInfo[];
    };
    body: {
      paragraphs: Paragraph[];
      tables: Table[];
      images: ImageInfo[];
    };
    footer?: {
      paragraphs: Paragraph[];
      tables: Table[];
      images: ImageInfo[];
    };
  };
  styles?: Record<string, any>;
}

export interface DocxFile {
  file: File;
  name: string;
  size: number;
  lastModified: number;
  status: 'ok' | 'error' | 'loading';
  error?: string;
  fileType?: FileType;
}
