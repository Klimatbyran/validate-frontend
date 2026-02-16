import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, MinusCircle, Calculator, CircleDashed, ArrowLeftRight, AlertCircle, ChevronsUpDown } from 'lucide-react';
import type { DiscrepancyType } from './types';

export const discrepancyConfig: Record<
  DiscrepancyType,
  {
    icon: React.ReactNode;
    label: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  }
> = {
  identical: {
    icon: React.createElement(CheckCircle2, { className: 'w-4 h-4' }),
    label: 'Identical',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/20',
  },
  'both-null': {
    icon: React.createElement(CircleDashed, { className: 'w-4 h-4' }),
    label: 'Both Empty',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-500/20',
  },
  hallucination: {
    icon: React.createElement(AlertTriangle, { className: 'w-4 h-4' }),
    label: 'Hallucination',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/20',
  },
  missing: {
    icon: React.createElement(MinusCircle, { className: 'w-4 h-4' }),
    label: 'Missing',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/20',
  },
  rounding: {
    icon: React.createElement(Calculator, { className: 'w-4 h-4' }),
    label: 'Rounding',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/20',
  },
  'unit-error': {
    icon: React.createElement(ChevronsUpDown, { className: 'w-4 h-4' }),
    label: 'Unit Error',
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-400',
    borderColor: 'border-indigo-500/20',
  },
  'small-error': {
    icon: React.createElement(AlertCircle, { className: 'w-4 h-4' }),
    label: 'Small Error',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/20',
  },
  'category-error': {
    icon: React.createElement(ArrowLeftRight, { className: 'w-4 h-4' }),
    label: 'Category Error',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
  },
  error: {
    icon: React.createElement(XCircle, { className: 'w-4 h-4' }),
    label: 'Error',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/20',
  },
};
