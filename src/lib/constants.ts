export const WORKFLOW_STAGES = [
  { id: 'nlmParsePDF', name: 'PDF Parsning' },
  { id: 'nlmExtractTables', name: 'Tabellextraktion' },
  { id: 'precheck', name: 'Förkontroll' },
  { id: 'guessWikidata', name: 'Wikidata' },
  { id: 'diffReportingPeriods', name: 'Räkenskapsår' },
  { id: 'extractEmissions', name: 'Utsläppsdata' },
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