import React from 'react';
import { motion } from 'framer-motion';
import mermaid from 'mermaid';

// Initialize mermaid with dark theme configuration
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  themeVariables: {
    primaryColor: '#F48F2A',
    primaryTextColor: '#F7F7F7',
    primaryBorderColor: '#2E2E2E',
    lineColor: '#878787',
    secondaryColor: '#59A0E1',
    tertiaryColor: '#AAE506',
  },
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true,
    curve: 'basis',
  },
  securityLevel: 'loose',
});

export function WorkflowDiagram() {
  const [svg, setSvg] = React.useState<string>('');

  // Create the diagram without job counts
  const diagram = React.useMemo(() => {

    return `
      flowchart TB
        %% Define subgraphs with styling
        subgraph Input["Input"]
          style Input fill:none,stroke:#2E2E2E,color:#878787
          PDF[PDF]
          Cache[Cache]
          NLM[Parse PDF]
          Tables[Tables]
        end

        subgraph Processing["Processing"]
          style Processing fill:none,stroke:#2E2E2E,color:#878787
          Precheck[Precheck]
          GuessWikidata[Wikidata]
          FiscalYear[Fiscal Year]
          Emissions[Emissions]
        end

        subgraph Analysis["Analysis"]
          style Analysis fill:none,stroke:#2E2E2E,color:#878787
          Industry[Industry]
          Scope1[Scope 1+2]
          Scope3[Scope 3]
          Biogenic[Biogenic]
          Goals[Goals]
          Initiatives[Initiatives]
          Turnover[Turnover]
          Employees[Employees]
          BaseYear[Base Year]
        end

        subgraph Output["Output"]
          style Output fill:none,stroke:#2E2E2E,color:#878787
          Tags[Tags]
          Wikipedia[Wikipedia]
          Markdown[Markdown]
          CheckDB[DB Check]
          Review[Review]
          API((API))
        end

        %% Flow
        PDF --> Cache
        Cache --> NLM
        NLM --> Tables
        Tables --> Precheck
        Cache --> Precheck

        %% Processing flow
        Precheck --> GuessWikidata
        Precheck --> FiscalYear
        GuessWikidata --> Emissions
        FiscalYear --> Emissions

        %% Analysis flow
        Emissions --> Industry
        Emissions --> Scope1
        Emissions --> Scope3
        Emissions --> Biogenic
        Emissions --> Goals
        Emissions --> Initiatives
        Emissions --> Turnover
        Emissions --> Employees
        Emissions --> BaseYear

        %% Output flow
        Industry --> Tags
        Scope1 --> Tags
        Scope3 --> Tags
        Biogenic --> Tags
        Goals --> Tags
        Initiatives --> Tags
        Turnover --> Tags
        Employees --> Tags
        BaseYear --> Tags

        Industry --> Wikipedia
        Scope1 --> Wikipedia
        Scope3 --> Wikipedia
        Biogenic --> Wikipedia
        Goals --> Wikipedia
        Initiatives --> Wikipedia
        Turnover --> Wikipedia
        Employees --> Wikipedia
        BaseYear --> Wikipedia

        Industry --> Markdown
        Scope1 --> Markdown
        Scope3 --> Markdown
        Biogenic --> Markdown
        Goals --> Markdown
        Initiatives --> Markdown
        Turnover --> Markdown
        Employees --> Markdown
        BaseYear --> Markdown

        Tags --> CheckDB
        Wikipedia --> CheckDB
        Markdown --> CheckDB
        CheckDB --> Review
        Review --> API

        %% Node styling
        classDef default fill:#2E2E2E,stroke:#878787,color:#F7F7F7
        classDef active fill:#59A0E1,stroke:#206288,color:#F7F7F7
        classDef waiting fill:#F48F2A,stroke:#B25F00,color:#F7F7F7
        classDef completed fill:#AAE506,stroke:#6C9105,color:#F7F7F7
        classDef failed fill:#F0759A,stroke:#97455D,color:#F7F7F7

    `;
  }, []);

  React.useEffect(() => {
    const renderDiagram = async () => {
      try {
        const { svg } = await mermaid.render('workflow-diagram', diagram);
        setSvg(svg);
      } catch (error) {
        console.error('Failed to render diagram:', error);
      }
    };

    renderDiagram();
  }, [diagram]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-04/80 backdrop-blur-sm rounded-lg p-6"
    >
      <h2 className="text-xl font-semibold text-gray-01 mb-6">
        Processflöde
      </h2>
      <div 
        className="text-center overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </motion.div>
  );
}