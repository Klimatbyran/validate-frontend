import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QueueJob } from '@/lib/types';
import { WORKFLOW_STAGES } from '@/lib/constants';
import { 
  CheckCircle2, 
  AlertTriangle,
  MessageSquare,
  RotateCcw,
  Check,
  X,
  ArrowUpRight,
  GitBranch,
  HelpCircle,
  Info,
  Code,
  FileText,
} from 'lucide-react';
import { WikidataPreview } from './wikidata-preview';
import { FiscalYearDisplay } from './fiscal-year-display';
import { MarkdownVectorPagesDisplay } from './markdown-display';
import { ScopeEmissionsDisplay } from './scope-emissions-display';
import { isMarkdown } from '@/lib/utils';

interface JobDetailsDialogProps {
  job: QueueJob | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: (approved: boolean) => void;
  onRetry?: () => void;
}

function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Renders a user-friendly view of JSON data
function UserFriendlyDataView({ data, job }: { data: any; job?: QueueJob }) {
  const processedData = typeof data === 'string' && isJsonString(data) 
    ? JSON.parse(data) 
    : data;
  
  // Also check job return value for scope data
  let returnValueData = null;
  if (job?.returnValue && typeof job.returnValue === 'string' && isJsonString(job.returnValue)) {
    try {
      returnValueData = JSON.parse(job.returnValue);
    } catch (e) {
      // Ignore parse errors
    }
  } else if (job?.returnValue && typeof job.returnValue === 'object') {
    // If returnValue.value exists, use it as the main return value
    if ('value' in job.returnValue && job.returnValue.value) {
      returnValueData = job.returnValue.value;
    } else {
      returnValueData = job.returnValue;
    }
  }
  
  // List of technical fields to hide from the user-friendly view
  const technicalFields = ['autoApprove', 'threadId', 'messageId', 'url'];
  
  // Extract special fields
  const wikidataField = processedData.wikidata;
  const hasWikidata = wikidataField && typeof wikidataField === 'object';
  
  // Check if we have fiscal year data
  const hasFiscalYear = processedData.fiscalYear || 
    (processedData.startMonth && processedData.endMonth);
  
  // Check if we have scope1+2 emissions data (in job data or return value)
  const hasScopeData = (
    (processedData.scope12 && Array.isArray(processedData.scope12)) ||
    (returnValueData && typeof returnValueData === 'object' && Array.isArray(returnValueData.scope12)) ||
    (returnValueData && typeof returnValueData === 'object' && returnValueData.value && Array.isArray(returnValueData.value.scope12))
  );

  // Get scope data from any possible source
  let scopeData = undefined;
  if (processedData.scope12 && Array.isArray(processedData.scope12)) {
    scopeData = processedData.scope12;
  } else if (returnValueData && typeof returnValueData === 'object' && Array.isArray(returnValueData.scope12)) {
    scopeData = returnValueData.scope12;
  } else if (returnValueData && typeof returnValueData === 'object' && returnValueData.value && Array.isArray(returnValueData.value.scope12)) {
    scopeData = returnValueData.value.scope12;
  }
  
  const renderValue = (value: any): React.ReactNode => {
    if (value === null) return <span className="text-gray-02">Inget värde</span>;
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nej';
    if (typeof value === 'string') {
      // Use MarkdownDisplay for all markdown rendering
      if (isMarkdown(value)) {
        return (
            <MarkdownVectorPagesDisplay value={value} />
        );
      }
      return String(value);
    }
    if (typeof value === 'number') return String(value);
    if (Array.isArray(value)) {
      const items: Array<React.ReactElement> = (value as unknown[])
        .map((item, i) => {
          const rendered = renderValue(item);
          if (rendered == null) return null;
          return <li key={i}>{rendered as React.ReactNode}</li>;
        })
        .filter(Boolean) as Array<React.ReactElement>;
      return (
        <ul className="list-disc pl-5 space-y-1">
          {items}
        </ul>
      );
    }
    if (typeof value === 'object') {
      const entries: Array<React.ReactElement> = Object.entries(value)
        .map(([k, v]) => {
          // Skip technical fields in nested objects too
          if (technicalFields.includes(k)) return null;
          return (
            <div key={k}>
              <span className="font-medium text-gray-01">{k}:</span>{' '}
              {renderValue(v)}
            </div>
          );
        })
        .filter(Boolean) as Array<React.ReactElement>;
      return (
        <div className="pl-4 border-l-2 border-gray-03/50 mt-2 space-y-2">
          {entries}
        </div>
      );
    }
    return String(value);
  };

  if (typeof processedData !== 'object') {
    return <div>{String(processedData)}</div>;
  }

  return (
    <div className="space-y-3 text-sm">
      {/* Show Wikidata preview if available */}
      {hasWikidata && (
        <div className="mb-4">
          <WikidataPreview data={wikidataField} />
        </div>
      )}
      
      {/* Show Fiscal Year display if available */}
      {hasFiscalYear && (
        <div className="mb-4">
          <FiscalYearDisplay data={{
            fiscalYear: processedData.fiscalYear
          }} />
        </div>
      )}
      
      {/* Show Scope 1+2 emissions data if available */}
      {hasScopeData && (
        (() => { console.log('ScopeEmissionsDisplay data:', { scope12: scopeData }); return null; })()
      )}
      {hasScopeData && (
        <div className="mb-4">
          <ScopeEmissionsDisplay data={{ scope12: scopeData }} />
        </div>
      )}
      
      {/* Show Metadata if available (from returnValueData) */}
      {returnValueData && typeof returnValueData === 'object' && 'metadata' in returnValueData && returnValueData.metadata && (
        <MetadataDisplay metadata={returnValueData.metadata} />
      )}

      {Object.entries(processedData).map(([key, value]) => {
        // Skip technical fields and special fields (since we're showing them separately)
        if (technicalFields.includes(key) || 
            key === 'wikidata' || 
            key === 'fiscalYear' || 
            key === 'startMonth' || 
            key === 'endMonth' ||
            key === 'scope12') return null;
        
        return (
          <div key={key} className="bg-gray-03/20 rounded-lg p-3">
            <div className="font-medium text-gray-01 mb-1">{key}</div>
            <div className="text-gray-02">{renderValue(value)}</div>
          </div>
        );
      })}
    </div>
  );
}

// Add a component for displaying metadata
function MetadataDisplay({ metadata }: { metadata: any }) {
  if (!metadata) return null;
  
  const hasPrompt = metadata.prompt && typeof metadata.prompt === 'string';
  const hasContext = metadata.context && typeof metadata.context === 'string';
  
  return (
    <div className="mb-4 max-w-full">
      <div className="bg-gray-03/20 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-01 mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2 text-gray-02" />
          Metadata
        </h3>
        
        <div className="space-y-3">
          {/* Expandable Prompt Section */}
          {hasPrompt && (
            <details className="bg-blue-03/10 border border-blue-03/30 rounded-lg overflow-hidden">
              <summary className="cursor-pointer p-3 bg-blue-03/5 hover:bg-blue-03/10 transition-colors select-none">
                <span className="font-medium text-blue-03">Prompt</span>
              </summary>
              <div className="p-4 text-gray-01 whitespace-pre-line bg-white border-t border-blue-03/20">
                {metadata.prompt}
              </div>
            </details>
          )}
          
          {/* Expandable Context Section */}
          {hasContext && (
            <details className="bg-green-03/10 border border-green-03/30 rounded-lg overflow-hidden">
              <summary className="cursor-pointer p-3 bg-green-03/5 hover:bg-green-03/10 transition-colors select-none">
                <span className="font-medium text-green-03">Context</span>
              </summary>
              <div className="p-4 bg-white border-t border-green-03/20">
                <div className="prose max-w-full text-gray-01 mb-4">
                  <MarkdownVectorPagesDisplay value={metadata.context} />
                </div>
                <details className="bg-gray-03/10 border border-gray-03/30 rounded-lg overflow-hidden">
                  <summary className="cursor-pointer p-2 bg-gray-03/5 hover:bg-gray-03/10 transition-colors select-none">
                    <span className="text-sm font-medium text-gray-01">Raw Context</span>
                  </summary>
                  <div className="p-3 bg-white border-t border-gray-03/20">
                    <pre className="text-xs text-gray-01 overflow-x-auto bg-gray-04 p-3 rounded whitespace-pre-wrap">
                      {metadata.context}
                    </pre>
                  </div>
                </details>
              </div>
            </details>
          )}
          
          {/* Expandable Raw Context Section */}
          <details className="bg-gray-03/10 border border-gray-03/30 rounded-lg overflow-hidden">
            <summary className="cursor-pointer p-3 bg-gray-03/5 hover:bg-gray-03/10 transition-colors select-none">
              <span className="font-medium text-gray-01">Raw Context</span>
            </summary>
            <div className="p-4 bg-white border-t border-gray-03/20">
              <pre className="text-xs text-gray-01 overflow-x-auto bg-gray-04 p-3 rounded whitespace-pre-wrap">
                {metadata.context}
              </pre>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

// Technical JSON viewer with expand/collapse functionality
function JsonViewer({ data }: { data: any }) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="font-mono text-sm">
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-03 hover:bg-blue-03/10"
        >
          {isExpanded ? 'Komprimera' : 'Expandera'}
        </Button>
      </div>
      <pre className={`
        bg-gray-03/20 rounded-lg p-3 overflow-x-auto
        ${isExpanded ? 'max-h-none' : 'max-h-32'}
      `}>
        {JSON.stringify(
          typeof data === 'string' ? JSON.parse(data) : data,
          null,
          2
        )}
      </pre>
    </div>
  );
}

export function JobDetailsDialog({ 
  job, 
  isOpen, 
  onOpenChange,
  onApprove,
  onRetry
}: JobDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState<'user' | 'technical'>('user');
  
  if (!job) return null;

  const stage = WORKFLOW_STAGES.find(s => s.id === job.queueId);
  const needsApproval = !job.data.approved && !job.data.autoApprove;
  const canRetry = job.isFailed;
  const hasParent = !!job.parent;

  const handleApprove = (approved: boolean) => {
    if (onApprove) {
      onApprove(approved);
      onOpenChange(false);
      toast.success(approved ? 'Jobbet godkänt' : 'Jobbet avvisat');
    }
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
      onOpenChange(false);
      toast.success('Jobbet omstartat');
    }
  };

  const getStatusIcon = () => {
    if (needsApproval) return <HelpCircle className="w-5 h-5 text-blue-03" />;
    if (job.isFailed) return <AlertTriangle className="w-5 h-5 text-pink-03" />;
    if (job.finishedOn) return <CheckCircle2 className="w-5 h-5 text-green-03" />;
    if (job.processedOn) return (
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <RotateCcw className="w-5 h-5 text-blue-03" />
      </motion.div>
    );
    return <MessageSquare className="w-5 h-5 text-gray-02" />;
  };

  const getStatusColor = () => {
    if (needsApproval) return 'bg-blue-03/20';
    if (job.isFailed) return 'bg-pink-03/20';
    if (job.finishedOn) return 'bg-green-03/20';
    if (job.processedOn) return 'bg-blue-03/20';
    return 'bg-gray-03/20';
  };

  const getStatusText = () => {
    if (needsApproval) return 'Väntar på godkännande';
    if (job.isFailed) return 'Misslyckad';
    if (job.finishedOn) return 'Slutförd';
    if (job.processedOn) return 'Bearbetar';
    return 'Väntar';
  };

  // Filter out metadata fields from job data
  const getFilteredJobData = () => {
    const { companyName, description, ...rest } = job.data;
    return rest;
  };
  
  // Filter out schema and metadata fields from job data for user-friendly view
  const getFilteredJobDataWithoutSchema = () => {
    const { companyName, description, schema, ...rest } = job.data;
    return rest;
  };
  
  // Get URL from job data if it exists
  const getDocumentUrl = () => {
    return job.data.url || null;
  };

  // Simplified view for jobs that need approval
  if (needsApproval && activeTab === 'user') {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-6xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl mb-2">
                  {job.data.companyName || job.data.company}
                </DialogTitle>
                {job.data.description && (
                  <DialogDescription className="text-base">
                    {job.data.description}
                  </DialogDescription>
                )}
              </div>
              {job.data.url && (
                <a 
                  href={job.data.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 text-blue-03 hover:text-blue-03/80 bg-blue-03/10 p-2 rounded-full"
                  title="Öppna källdokument"
                >
                  <FileText className="w-5 h-5" />
                </a>
              )}
            </div>
          </DialogHeader>

          <div className="flex items-center space-x-2 mb-6">
            <Button
              variant={activeTab === 'user' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('user')}
              className="rounded-full"
            >
              <Info className="w-4 h-4 mr-2" />
              Översikt
            </Button>
            <Button
              variant={activeTab === 'technical' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('technical')}
              className="rounded-full"
            >
              <Code className="w-4 h-4 mr-2" />
              Tekniska detaljer
            </Button>
          </div>

          <div className="space-y-6 my-6">
            <div className="bg-blue-03/10 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-full bg-blue-03/20">
                  <HelpCircle className="w-5 h-5 text-blue-03" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-blue-03">Godkännande krävs</h3>
                  <p className="text-sm text-blue-03/80">
                    Vänligen granska informationen och godkänn eller avvisa.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-03/20 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-01 mb-4">Information</h3>
              <UserFriendlyDataView data={getFilteredJobDataWithoutSchema()} job={job} />
            </div>

       
          </div>

          <DialogFooter>
            <div className="flex justify-between w-full">
              <div></div>
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => handleApprove(false)}
                  className="border-pink-03 text-pink-03 hover:bg-pink-03/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avvisa
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleApprove(true)}
                  className="bg-green-03 text-white hover:bg-green-03/90"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Godkänn
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Technical view or non-approval jobs
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-6xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl mb-2">
                {job.data.companyName || job.data.company}
              </DialogTitle>
              {job.data.description && (
                <DialogDescription className="text-base">
                  {job.data.description}
                </DialogDescription>
              )}
            </div>
            {job.data.url && (
              <a 
                href={job.data.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-blue-03 hover:text-blue-03/80 bg-blue-03/10 p-2 rounded-full"
                title="Öppna källdokument"
              >
                <FileText className="w-5 h-5" />
              </a>
            )}
          </div>
        </DialogHeader>

        <div className="flex items-center space-x-2 mb-6">
          <Button
            variant={activeTab === 'user' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('user')}
            className="rounded-full"
          >
            <Info className="w-4 h-4 mr-2" />
            Översikt
          </Button>
          <Button
            variant={activeTab === 'technical' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('technical')}
            className="rounded-full"
          >
            <Code className="w-4 h-4 mr-2" />
            Tekniska detaljer
          </Button>
        </div>

        <div className="space-y-6 my-6">
          {activeTab === 'user' ? (
            <>
              {/* Status Section */}
              <div className="bg-gray-03/20 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-01 mb-4">Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getStatusColor()}`}>
                      {getStatusIcon()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-01">
                        {stage?.name || job.queueId}
                      </div>
                      <div className="text-sm text-gray-02">
                        {getStatusText()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-02">Skapad</div>
                    <div className="text-gray-01">
                      {new Date(job.timestamp).toLocaleString('sv-SE')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Relationships Section */}
              {hasParent && job.parent && (
                <div className="bg-blue-03/10 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-03 mb-4 flex items-center">
                    <GitBranch className="w-5 h-5 mr-2" />
                    Jobbrelationer
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-blue-03">
                      <ArrowUpRight className="w-5 h-4" />
                      <span className="text-sm">Förälder:</span>
                      <code className="bg-blue-03/20 px-2 py-1 rounded text-sm">
                        {job.parent.queue}:{job.parent.id}
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* Information Section */}
              <div className="bg-gray-03/20 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-01 mb-4">Information</h3>
                <UserFriendlyDataView data={getFilteredJobDataWithoutSchema()} job={job} />
              </div>

              {/* Error Section */}
              {job.isFailed && job.stacktrace.length > 0 && (
                <div className="bg-pink-03/10 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-pink-03 mb-4">Felmeddelande</h3>
                  <div className="text-pink-03 text-sm">
                    {job.stacktrace[0]}
                    {job.stacktrace.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('technical')}
                        className="mt-2 text-pink-03 hover:bg-pink-03/10"
                      >
                        Visa fullständigt felmeddelande
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Schema Section (if present) */}
              {job.data.schema && (
                <div className="bg-blue-03/10 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-03 mb-4 flex items-center">
                    <Code className="w-5 h-5 mr-2" />
                    Schema
                  </h3>
                  <div className="bg-gray-04 rounded-lg p-3">
                    <JsonViewer data={job.data.schema} />
                  </div>
                </div>
              )}
              
              {/* Technical Job Data Section */}
              <div className="bg-gray-03/20 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-01 mb-4">Teknisk data</h3>
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(job.data).map(([key, value]) => {
                    if (key === 'companyName' || key === 'description' || key === 'schema') return null;
                    
                    return (
                      <div key={key} className="bg-gray-04 rounded-lg p-3">
                        <div className="text-sm text-gray-02 mb-1">{key}</div>
                        <div className="text-gray-01 break-words">
                          {typeof value === 'string' && isJsonString(value) ? (
                            <JsonViewer data={value} />
                          ) : typeof value === 'object' ? (
                            <JsonViewer data={value} />
                          ) : (
                            String(value)
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Error Section */}
              {job.isFailed && job.stacktrace.length > 0 && (
                <div className="bg-pink-03/10 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-pink-03 mb-4">Fullständigt felmeddelande</h3>
                  <pre className="text-pink-03 text-sm overflow-x-auto">
                    {job.stacktrace.join('\n')}
                  </pre>
                </div>
              )}

              {/* Job Metadata */}
              <div className="bg-gray-03/20 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-01 mb-4">Jobbmetadata</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-02">ID</div>
                    <div className="font-mono text-gray-01">{job.id}</div>
                  </div>
                  <div>
                    <div className="text-gray-02">Kö</div>
                    <div className="text-gray-01">{job.queueId}</div>
                  </div>
                  <div>
                    <div className="text-gray-02">Skapad</div>
                    <div className="text-gray-01">{new Date(job.timestamp).toLocaleString('sv-SE')}</div>
                  </div>
                  <div>
                    <div className="text-gray-02">Startad</div>
                    <div className="text-gray-01">
                      {job.processedOn ? new Date(job.processedOn).toLocaleString('sv-SE') : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-02">Avslutad</div>
                    <div className="text-gray-01">
                      {job.finishedOn ? new Date(job.finishedOn).toLocaleString('sv-SE') : '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-02">Försök</div>
                    <div className="text-gray-01">{job.attemptsMade}</div>
                  </div>
                </div>
              </div>

            </>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {canRetry && (
                <Button
                  variant="ghost"
                  onClick={handleRetry}
                  className="text-blue-03 hover:bg-blue-03/10"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Försök igen
                </Button>
              )}
            </div>
            {needsApproval && (
              <div className="space-x-2">
                <Button
                  variant="ghost"
                  onClick={() => handleApprove(false)}
                  className="border-pink-03 text-pink-03 hover:bg-pink-03/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avvisa
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleApprove(true)}
                  className="bg-green-03 text-white hover:bg-green-03/90"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Godkänn
                </Button>
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
