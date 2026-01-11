import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { DocumentStructure, Paragraph, ParagraphRun, Table, ImageInfo } from '../types';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true
});

export async function parseDocx(file: File): Promise<DocumentStructure> {
  const zip = await JSZip.loadAsync(file);
  const documentXml = await zip.file('word/document.xml')?.async('string');
  const stylesXml = await zip.file('word/styles.xml')?.async('string');
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('string');
  
  if (!documentXml) {
    throw new Error('Arquivo DOCX inválido: document.xml não encontrado');
  }

  const doc = parser.parse(documentXml);
  const styles = stylesXml ? parser.parse(stylesXml) : null;
  const rels = relsXml ? parser.parse(relsXml) : null;

  const imageRelations: Map<string, ImageInfo> = new Map();
  if (rels?.Relationships?.Relationship) {
    const relationships = Array.isArray(rels.Relationships.Relationship)
      ? rels.Relationships.Relationship
      : [rels.Relationships.Relationship];
    
    let imageIndex = 0;
    for (const rel of relationships) {
      if (rel['@_Type']?.includes('image')) {
        const relationId = rel['@_Id'];
        const target = rel['@_Target'];
        imageRelations.set(relationId, {
          relationId,
          location: 'body',
          index: imageIndex++,
          name: target
        });
      }
    }
  }

  const body = doc['w:document']?.['w:body'];
  if (!body) {
    throw new Error('Estrutura do documento inválida');
  }

  const structure: DocumentStructure = {
    fileType: 'docx',
    sections: {
      body: {
        paragraphs: [],
        tables: [],
        images: []
      }
    },
    styles: styles ? extractStyles(styles) : undefined
  };

  let paraIndex = 0;
  let tableIndex = 0;
  let imageIndex = 0;

  const allElements: any[] = [];
  if (body['w:p']) {
    const paras = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];
    paras.forEach((p: any) => allElements.push({ type: 'p', data: p }));
  }
  if (body['w:tbl']) {
    const tbls = Array.isArray(body['w:tbl']) ? body['w:tbl'] : [body['w:tbl']];
    tbls.forEach((t: any) => allElements.push({ type: 'tbl', data: t }));
  }

  for (const elem of allElements) {
    if (elem.type === 'p') {
      const para = parseParagraph(elem.data, paraIndex++);
      
      if (elem.data['w:r']) {
        const runs = Array.isArray(elem.data['w:r']) ? elem.data['w:r'] : [elem.data['w:r']];
        for (const run of runs) {
          const imageRel = extractImageFromRun(run);
          if (imageRel) {
            const imgInfo = imageRelations.get(imageRel);
            if (imgInfo) {
              imgInfo.location = 'body';
              imgInfo.index = imageIndex++;
              structure.sections.body.images.push(imgInfo);
            }
          }
        }
      }
      
      if (para.runs.length > 0 || para.runs.some(r => r.text.trim().length > 0)) {
        structure.sections.body.paragraphs.push(para);
      }
    } else if (elem.type === 'tbl') {
      const table = parseTable(elem.data, tableIndex++);
      structure.sections.body.tables.push(table);
    }
  }

  const headerFiles = Object.keys(zip.files).filter(f => f.startsWith('word/header') && f.endsWith('.xml'));
  const footerFiles = Object.keys(zip.files).filter(f => f.startsWith('word/footer') && f.endsWith('.xml'));

  if (headerFiles.length > 0) {
    const headerXml = await zip.file(headerFiles[0])?.async('string');
    if (headerXml) {
      const headerDoc = parser.parse(headerXml);
      const headerBody = headerDoc['w:hdr']?.['w:p'] || headerDoc['w:hdr'];
      if (headerBody) {
        const headerParas = Array.isArray(headerBody['w:p']) ? headerBody['w:p'] : (headerBody['w:p'] ? [headerBody['w:p']] : []);
        let headerImageIndex = 0;
        const headerImages: ImageInfo[] = [];
        
        for (const p of headerParas) {
          if (p['w:r']) {
            const runs = Array.isArray(p['w:r']) ? p['w:r'] : [p['w:r']];
            for (const run of runs) {
              const imageRel = extractImageFromRun(run);
              if (imageRel) {
                const imgInfo = imageRelations.get(imageRel);
                if (imgInfo) {
                  imgInfo.location = 'header';
                  imgInfo.index = headerImageIndex++;
                  headerImages.push(imgInfo);
                }
              }
            }
          }
        }
        
        structure.sections.header = {
          paragraphs: headerParas.map((p: any, idx: number) => parseParagraph(p, idx)).filter((p: Paragraph) => p.runs.length > 0),
          tables: [],
          images: headerImages
        };
        
        if (headerImages.length > 0) {
          const mainLogo = headerImages.reduce((prev, curr) => {
            const prevSize = (prev.width || 0) * (prev.height || 0);
            const currSize = (curr.width || 0) * (curr.height || 0);
            return currSize > prevSize ? curr : prev;
          }, headerImages[0]);
          mainLogo.isMainLogo = true;
        }
      }
    }
  }

  if (footerFiles.length > 0) {
    const footerXml = await zip.file(footerFiles[0])?.async('string');
    if (footerXml) {
      const footerDoc = parser.parse(footerXml);
      const footerBody = footerDoc['w:ftr']?.['w:p'] || footerDoc['w:ftr'];
      if (footerBody) {
        const footerParas = Array.isArray(footerBody['w:p']) ? footerBody['w:p'] : (footerBody['w:p'] ? [footerBody['w:p']] : []);
        structure.sections.footer = {
          paragraphs: footerParas.map((p: any, idx: number) => parseParagraph(p, idx)).filter((p: Paragraph) => p.runs.length > 0),
          tables: [],
          images: []
        };
      }
    }
  }

  return structure;
}

function parseParagraph(p: any, index: number): Paragraph {
  const runs: ParagraphRun[] = [];
  
  if (p['w:r']) {
    const runElements = Array.isArray(p['w:r']) ? p['w:r'] : [p['w:r']];
    for (const r of runElements) {
      const run = parseRun(r);
      if (run) {
        runs.push(run);
      }
    }
  }

  const pPr = p['w:pPr'];
  let alignment: 'left' | 'center' | 'right' | 'justify' | undefined;
  let styleId: string | undefined;
  let spacing: any;
  let indent: any;

  if (pPr) {
    if (pPr['w:jc']) {
      const jc = pPr['w:jc']['@_w:val'] || pPr['w:jc'];
      if (jc === 'center') alignment = 'center';
      else if (jc === 'right') alignment = 'right';
      else if (jc === 'justify') alignment = 'justify';
      else alignment = 'left';
    }
    styleId = pPr['w:pStyle']?.['@_w:val'];
    spacing = pPr['w:spacing'];
    indent = pPr['w:ind'];
  }

  return {
    runs,
    alignment,
    styleId,
    spacing: spacing ? {
      before: spacing['@_w:before'],
      after: spacing['@_w:after'],
      line: spacing['@_w:line']
    } : undefined,
    indent: indent ? {
      left: indent['@_w:left'],
      right: indent['@_w:right']
    } : undefined,
    index
  };
}

function parseRun(r: any): ParagraphRun | null {
  const text = extractText(r);
  if (!text && !r['w:drawing'] && !r['w:pict']) {
    return null;
  }

  const rPr = r['w:rPr'] || {};
  const bold = !!rPr['w:b'] || !!rPr['w:b']?.['@_w:val'];
  const italic = !!rPr['w:i'] || !!rPr['w:i']?.['@_w:val'];
  const underline = !!rPr['w:u'] || !!rPr['w:u']?.['@_w:val'];
  
  const fontSize = rPr['w:sz']?.['@_w:val'] ? rPr['w:sz']['@_w:val'] / 2 : undefined;
  const color = rPr['w:color']?.['@_w:val'];
  const fontFamily = rPr['w:rFonts']?.['@_w:ascii'] || rPr['w:rFonts']?.['@_w:hAnsi'];
  const highlight = rPr['w:highlight']?.['@_w:val'];

  if (r['w:drawing'] || r['w:pict']) {
    return {
      text: '[IMAGE]',
      bold,
      italic,
      underline,
      fontSize,
      color,
      fontFamily,
      highlight
    };
  }

  return {
    text: text || '',
    bold,
    italic,
    underline,
    fontSize,
    color,
    fontFamily,
    highlight
  };
}

function extractText(r: any): string {
  if (r['w:t']) {
    const texts = Array.isArray(r['w:t']) ? r['w:t'] : [r['w:t']];
    return texts.map((t: any) => {
      if (typeof t === 'string') return t;
      return t['#text'] || t['@_xml:space'] === 'preserve' ? (t['#text'] || '') : '';
    }).join('');
  }
  if (r['w:tab']) return '\t';
  if (r['w:br']) return '\n';
  return '';
}

function extractImageFromRun(runElement: any): string | null {
  if (runElement['w:drawing']) {
    const embed = runElement['w:drawing']?.['wp:inline']?.['a:graphic']?.['a:graphicData']?.['pic:pic']?.['pic:blipFill']?.['a:blip']?.['@_r:embed'];
    return embed || null;
  }
  if (runElement['w:pict']) {
    const embed = runElement['w:pict']?.['v:shape']?.['v:imagedata']?.['@_r:id'];
    return embed || null;
  }
  return null;
}

function parseTable(tbl: any, index: number): Table {
  const rows: any[] = Array.isArray(tbl['w:tr']) ? tbl['w:tr'] : (tbl['w:tr'] ? [tbl['w:tr']] : []);
  let maxCols = 0;
  const content: string[][] = [];

  for (const row of rows) {
    const cells = Array.isArray(row['w:tc']) ? row['w:tc'] : (row['w:tc'] ? [row['w:tc']] : []);
    const rowContent: string[] = [];
    for (const cell of cells) {
      const cellText = extractCellText(cell);
      rowContent.push(cellText);
    }
    maxCols = Math.max(maxCols, rowContent.length);
    content.push(rowContent);
  }

  return {
    rows: rows.length,
    cols: maxCols,
    index,
    content
  };
}

function extractCellText(cell: any): string {
  if (cell['w:p']) {
    const paras = Array.isArray(cell['w:p']) ? cell['w:p'] : [cell['w:p']];
    return paras.map((p: any) => {
      if (p['w:r']) {
        const runs = Array.isArray(p['w:r']) ? p['w:r'] : [p['w:r']];
        return runs.map((r: any) => extractText(r)).join('');
      }
      return '';
    }).join(' ');
  }
  return '';
}

function extractStyles(styles: any): Record<string, any> {
  const result: Record<string, any> = {};
  if (styles['w:styles']?.['w:style']) {
    const styleList = Array.isArray(styles['w:styles']['w:style'])
      ? styles['w:styles']['w:style']
      : [styles['w:styles']['w:style']];
    
    for (const style of styleList) {
      const styleId = style['@_w:styleId'];
      if (styleId) {
        result[styleId] = style;
      }
    }
  }
  return result;
}
