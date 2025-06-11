import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ReportingPeriod } from "./types"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createEmptyReportingPeriod(): ReportingPeriod {
  return {
    startDate: "",
    endDate: "",
    emissions: {
      scope1: {
        total: null,
        unit: "tCO2e"
      },
      scope2: {
        mb: null,
        lb: null,
        unknown: null,
        unit: "tCO2e"
      },
      scope3: {
        categories: [],
        statedTotalEmissions: {
          total: null,
          unit: "tCO2e"
        }
      },
      statedTotalEmissions: {
          total: null,
          unit: "tCO2e"
      },
      biogenic: {
          total: null,
          unit: "tCO2e"
      }
    },
    economy: {
      turnover: {
        value: null,
        currency: "SEK"
      },
      employees: {
        value: null,
        unit: "FTE"
      }
    }
  }
}