# Estrutura do Projeto

```
Comparaçãodoc/
├── .gitignore
├── index.html
├── package.json
├── README.md
├── PROJECT_STRUCTURE.md
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── src/
    ├── App.tsx                    # Componente principal com roteamento
    ├── main.tsx                   # Entry point
    ├── types.ts                   # Tipos TypeScript
    ├── components/
    │   ├── FileDropzone.tsx       # Componente de upload de arquivos
    │   ├── SideBySidePreview.tsx  # Preview lado a lado
    │   ├── ReportSummary.tsx      # Resumo do relatório
    │   ├── IssueList.tsx          # Lista de issues
    │   ├── IssueDetails.tsx       # Detalhes da issue selecionada
    │   └── Filters.tsx             # Filtros de severidade e categoria
    ├── lib/
    │   ├── docxParser.ts          # Parser de DOCX/OOXML
    │   ├── compareDocx.ts         # Motor de comparação
    │   ├── normalize.ts           # Normalização de dados
    │   └── utils.ts               # Utilitários (cores, exportação, etc.)
    ├── services/
    │   └── compareService.ts      # Serviço de comparação (local/remote)
    ├── workers/
    │   └── compare.worker.ts      # Web Worker para comparação (opcional)
    └── styles/
        └── index.css              # Estilos globais
```

## Fluxo de Dados

1. **Upload** → `FileDropzone` → `parseDocx()` → `DocumentStructure`
2. **Comparação** → `compareService.compareLocal()` → `compareDocuments()` → `ComparisonResult`
3. **Visualização** → `ReportPage` → `IssueList` + `IssueDetails` + `SideBySidePreview`
4. **Exportação** → `exportToJSON()` / `exportToHTML()`

## Páginas

- `/` - HomePage: Upload de arquivos e preview
- `/report` - ReportPage: Relatório completo com filtros e exportação
