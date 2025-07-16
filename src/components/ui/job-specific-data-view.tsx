import React from 'react';
import { QueueJob } from '@/lib/types';
import { MarkdownVectorPagesDisplay } from './markdown-display';
import { isMarkdown } from '@/lib/utils';
import { WikidataPreview } from './wikidata-preview';
import { FiscalYearDisplay } from './fiscal-year-display';
import { ScopeEmissionsDisplay } from './scope-emissions-display';
import { MetadataDisplay } from './metadata-display';

interface JobSpecificDataViewProps {
  data: any;
  job?: QueueJob;
}

// Utility function to check if a string is valid JSON
function isJsonString(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

// Utility function to parse return value data from job
function parseReturnValueData(job?: QueueJob): any {
  if (!job?.returnValue) return null;
  
  if (typeof job.returnValue === 'string' && isJsonString(job.returnValue)) {
    try {
      return JSON.parse(job.returnValue);
    } catch (e) {
      return null;
    }
  } else if (typeof job.returnValue === 'object') {
    // If returnValue.value exists, use it as the main return value
    if ('value' in job.returnValue && job.returnValue.value) {
      return job.returnValue.value;
    } else {
      return job.returnValue;
    }
  }
  return null;
}

// Helper function to get scope data from various sources
function getScopeData(processedData: any, returnValueData: any): any {
  const hasScopeData = (
    (processedData.scope12 && Array.isArray(processedData.scope12)) ||
    (returnValueData && typeof returnValueData === 'object' && Array.isArray(returnValueData.scope12)) ||
    (returnValueData && typeof returnValueData === 'object' && returnValueData.value && Array.isArray(returnValueData.value.scope12))
  );

  if (!hasScopeData) return null;

  // Get scope data from any possible source
  if (processedData.scope12 && Array.isArray(processedData.scope12)) {
    return processedData.scope12;
  } else if (returnValueData && typeof returnValueData === 'object' && Array.isArray(returnValueData.scope12)) {
    return returnValueData.scope12;
  } else if (returnValueData && typeof returnValueData === 'object' && returnValueData.value && Array.isArray(returnValueData.value.scope12)) {
    return returnValueData.value.scope12;
  }
  
  return null;
}

export function JobSpecificDataView({ data, job }: JobSpecificDataViewProps) {
  const processedData = typeof data === 'string' && isJsonString(data) 
    ? JSON.parse(data) 
    : data;
  
  // Parse return value data from job
  const returnValueData = parseReturnValueData(job);
  
  // Get scope data for display
  const scopeData = getScopeData(processedData, returnValueData);
  
  // List of technical fields to hide from the user-friendly view
  const technicalFields = ['autoApprove', 'threadId', 'messageId', 'url'];
  
  const renderValue = (value: any): React.ReactNode => {
    if (value === null) return <span className="text-gray-02">Inget värde</span>;
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nej';
    if (typeof value === 'string') {
      if (isMarkdown(value)) {
        return <MarkdownVectorPagesDisplay value={value} />;
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
      {processedData.wikidata && typeof processedData.wikidata === 'object' && (
        <div className="mb-4">
          <WikidataPreview data={processedData.wikidata} />
        </div>
      )}
      
      {/* Show Fiscal Year display if available */}
      {(processedData.fiscalYear || (processedData.startMonth && processedData.endMonth)) && (
        <div className="mb-4">
          <FiscalYearDisplay data={{ fiscalYear: processedData.fiscalYear }} />
        </div>
      )}
      
      {/* Show Scope 1+2 emissions data if available */}
      {scopeData && (
        <div className="mb-4">
          <ScopeEmissionsDisplay data={{ scope12: scopeData }} />
        </div>
      )}
      
      {/* Show metadata if available (from returnValueData) */}
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