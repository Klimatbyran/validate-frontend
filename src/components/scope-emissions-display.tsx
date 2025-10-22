import { Scope12Section } from './scope/Scope12Section';
import { Scope3Section } from './scope/Scope3Section';

interface Scope12EmissionsData {
  scope12: Array<{
    year: number;
    scope1?: {
      total: number;
      unit: 'tCO2e' | 'tCO2';
    } | null;
    scope2?: {
      mb?: number;        // Market-based scope 2 emissions
      lb?: number;        // Location-based scope 2 emissions  
      unknown?: number;   // Unspecified scope 2 emissions
      unit: 'tCO2e' | 'tCO2';
    } | null;
  }>;
}

interface Scope3EmissionsData {
  scope3: Array<{
    year: number;
    // Support two shapes: flat or nested under scope3
    total?: number | null;
    unit?: 'tCO2e' | 'tCO2';
    categories?: Array<{ id?: string; name?: string; total?: number | null; unit?: string | null; category?: number }>;
    scope3?: {
      statedTotalEmissions?: { total?: number | null; unit?: string | null } | null;
      categories?: Array<{ category?: number; total?: number | null; unit?: string | null }> | null;
    } | null;
  }>;
}

interface Scope12EmissionsDisplayProps {
  data: Scope12EmissionsData;
}

interface Scope3EmissionsDisplayProps {
  data: Scope3EmissionsData;
  wikidataId?: string;
}

export function ScopeEmissionsDisplay({ data }: Scope12EmissionsDisplayProps) {
  return <Scope12Section data={data} />;
}

export function Scope3EmissionsDisplay({ data, wikidataId }: Scope3EmissionsDisplayProps) {
  return <Scope3Section data={data} wikidataId={wikidataId} />;
}