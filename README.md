# Comparador de Documentos Word (DOCX)

Sistema completo para comparação de documentos Word (DOCX) desenvolvido com React + Vite + TypeScript. Compara templates com documentos validando texto, formatação, estrutura e imagens.

## 🚀 Como Rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`

## 📋 Funcionalidades

### Home (/)
- Upload de 2 arquivos DOCX (template e documento)
- Configurações de comparação:
  - Ignorar espaços extras, quebras de linha, case, diferenças de fonte
  - Nível de rigor (Leve/Padrão/Rígido)
  - Sensibilidade de imagens (Baixa/Média/Alta)
  - Tolerâncias (fonte, espaçamento, imagem)
  - Palavras obrigatórias e proibidas
- Validação de tamanho (máx 20MB)
- Tudo roda local, nada é enviado para servidor

### Compare (/compare)
- Preview lado a lado (Template | Documento)
- Painel de diferenças com filtros
- Scroll sincronizado
- Navegação entre diferenças (anterior/próxima)
- Mostrar só diferenças
- Status da comparação em tempo real

### Report (/report)
- Resumo por severidade e categoria
- Lista de issues com filtros e busca
- Detalhes da issue selecionada
- Exportação: JSON, HTML
- Copiar resumo
- Baixar diagnóstico (AST + issues)
- Link para abrir no Compare

## ⚠️ Limitações de Posicionamento Aproximado

Como DOCX é OOXML e medir "posição exata" no navegador é difícil, o sistema usa **posicionamento/estrutura aproximada**:

### O que é aproximado:

1. **Hierarquia do Documento**
   - Seções: header, body, footer (baseado em arquivos XML separados)
   - Parágrafos: ordem de aparição no XML
   - Runs: blocos de texto formatado dentro de parágrafos
   - Tabelas: contagem de linhas/colunas

2. **Índice/Ordem dos Elementos**
   - Parágrafos: índice sequencial (0, 1, 2...)
   - Tabelas: índice sequencial
   - Imagens: ordem no fluxo do documento

3. **Imagens**
   - Localização aproximada: header/body/footer
   - Tamanho relativo (quando disponível no XML)
   - Logo principal: primeira ou maior imagem do header

### O que NÃO é detectado com precisão:

- Posição exata de imagens (coordenadas X/Y)
- Margens exatas (depende de estilos complexos)
- Posicionamento absoluto de elementos
- Ancoragem precisa (inline vs floating)
- Camadas/z-index

### Exemplo de Limitação:

Se um parágrafo no template está na posição visual "centro da página" e no documento está "esquerda", mas ambos têm o mesmo índice (ex: parágrafo 5), o sistema detectará diferenças de **alinhamento** (se especificado no XML), mas não detectará diferenças de **posição visual exata** se o alinhamento XML for o mesmo.

## 🏗️ Arquitetura

```
src/
├── pages/
│   ├── Home.tsx          # Upload + Config
│   ├── Compare.tsx        # Comparação visual
│   └── Report.tsx         # Relatório final
├── components/
│   ├── FileDropzone.tsx
│   ├── SideBySidePreview.tsx
│   ├── DiffPanel.tsx
│   ├── Filters.tsx
│   ├── IssueList.tsx
│   ├── IssueDetails.tsx
│   └── SummaryBar.tsx
├── lib/
│   ├── docxParser.ts     # Parser DOCX/OOXML
│   ├── normalize.ts      # Normalização + matching
│   ├── compareDocx.ts     # Motor de comparação
│   ├── diff.ts           # Diff de texto
│   └── utils.ts          # Utilitários
├── services/
│   └── compareService.ts # Local + Remote (stub)
├── workers/
│   └── compare.worker.ts # Web Worker
└── types.ts
```

## 🔄 Migração para API

### Contrato Atual

O serviço `compareService.ts` já está preparado:

```typescript
compareLocal(templateFile: File, docFile: File, options: CompareOptions): Promise<CompareResult>
compareRemote(templateFile: File, docFile: File, options: CompareOptions): Promise<CompareResult> // stub
```

### Endpoint da API (Futuro)

**POST** `/api/compare`

**Content-Type:** `multipart/form-data`

**Body:**
- `template`: File (DOCX)
- `document`: File (DOCX)
- `options`: JSON string (CompareOptions)

**Response:**
```json
{
  "summary": {
    "critical": 0,
    "major": 0,
    "minor": 0,
    "info": 0,
    "byCategory": { ... }
  },
  "issues": [ ... ],
  "metadata": {
    "templateName": "string",
    "documentName": "string",
    "parsedAt": "ISO string",
    "options": { ... }
  }
}
```

### Compatibilidade

As interfaces TypeScript (`Issue`, `CompareResult`, `CompareOptions`, etc.) permanecem as mesmas. Apenas atualizar `compareRemote()` para fazer a chamada HTTP.

### Tecnologias Sugeridas

**Node.js:**
- NestJS ou Express
- `docx` ou `officegen` para DOCX
- `fast-xml-parser` ou `xml2js`
- `multer` para upload

**ASP.NET Core (C#):**
- ASP.NET Core Web API
- `DocumentFormat.OpenXml` (SDK oficial Microsoft)
- `System.IO.Compression` para ZIP

## 📝 Exemplo de Output

```json
{
  "summary": {
    "critical": 1,
    "major": 2,
    "minor": 5,
    "info": 3,
    "byCategory": {
      "text": 2,
      "format": 4,
      "structure": 1,
      "image": 1,
      "header": 0,
      "footer": 0,
      "table": 0
    }
  },
  "issues": [
    {
      "id": "1234567890-abc123",
      "severity": "critical",
      "category": "image",
      "location": {
        "section": "header",
        "blockIndex": 0
      },
      "message": "Logotipo obrigatório ausente no header do documento",
      "hint": "O template possui logo no header, mas o documento não possui"
    },
    {
      "id": "1234567891-def456",
      "severity": "major",
      "category": "text",
      "location": {
        "section": "body",
        "blockIndex": 3
      },
      "message": "Texto divergente no parágrafo 4",
      "templateValue": "Texto do template...",
      "documentValue": "Texto do documento..."
    }
  ],
  "metadata": {
    "templateName": "template.docx",
    "documentName": "document.docx",
    "parsedAt": "2024-01-01T12:00:00.000Z",
    "options": { ... }
  }
}
```

## 🧪 Como Usar

1. **Home**: Faça upload dos arquivos e configure opções
2. **Compare**: Visualize diferenças lado a lado, filtre e navegue
3. **Report**: Veja resumo completo, exporte ou copie

## 🔧 Tecnologias

- React 18
- Vite
- TypeScript
- React Router
- jszip (leitura ZIP/DOCX)
- fast-xml-parser (parsing XML)
- diff-match-patch (diff de texto)

## 📄 Licença

Uso interno.
