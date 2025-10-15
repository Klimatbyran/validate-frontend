export const WORKFLOW_STAGES = [
  { id: 'nlmParsePDF', name: 'PDF Parsning' },
  { id: 'doclingParsePDF', name: 'Docling PDF Parsning' },
  { id: 'nlmExtractTables', name: 'Tabellextraktion' },
  { id: 'precheck', name: 'Förkontroll' },
  { id: 'guessWikidata', name: 'Wikidata' },
  { id: 'diffReportingPeriods', name: 'Räkenskapsår' },
  { id: 'extractEmissions', name: 'Utsläppsdata' },
  { id: 'followUpScope12', name: 'Uppföljning Scope 1&2' },
  { id: 'followUpScope3', name: 'Uppföljning Scope 3' },
  { id: 'followUpBiogenic', name: 'Uppföljning Biogenisk' },
  { id: 'followUpEconomy', name: 'Uppföljning Ekonomi' },
  { id: 'followUpGoals', name: 'Uppföljning Mål' },
  { id: 'followUpInitiatives', name: 'Uppföljning Initiativ' },
  { id: 'followUpFiscalYear', name: 'Uppföljning Räkenskapsår' },
  { id: 'followUpCompanyTags', name: 'Uppföljning Företagstaggar' },
  { id: 'followUpBaseYear', name: 'Uppföljning Basår' },
  { id: 'followUpIndustryGics', name: 'Uppföljning Bransch GICS' },
  { id: 'followUp', name: 'Uppföljning' },
  { id: 'diffIndustry', name: 'Bransch' },
  { id: 'diffGoals', name: 'Klimatmål' },
  { id: 'diffInitiatives', name: 'Initiativ' },
  { id: 'diffBaseYear', name: 'Basår' },
  { id: 'checkDB', name: 'DB Kontroll' },
  { id: 'sendCompanyLink', name: 'Granskning' },
  { id: 'saveToAPI', name: 'API Lagring' },
  { id: 'wikipediaUpload', name: 'Wikipedia' },
  { id: 'diffTags', name: 'Taggar' },
  { id: 'indexMarkdown', name: 'Markdown' }
];
/**
 * @deprecated This file is no longer needed.
 * All workflow configuration has been moved to workflow-config.ts
 *
 * Use the following imports instead:
 * - getWorkflowStages() from '@/lib/workflow-config'
 * - getAllPipelineSteps() from '@/lib/workflow-config'
 * - getFieldNamesForPipelineStep() from '@/lib/workflow-config'
 */
