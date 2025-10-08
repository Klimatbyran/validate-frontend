# Excluded Jobs Feature Implementation Plan

## Overview

Implement visual indicators for jobs that are intentionally excluded from processing to optimize API token usage and reduce emissions during report reruns.

## Business Context

- **Cost Optimization**: Skip jobs that don't need to run to save API tokens
- **Emission Reduction**: Reduce unnecessary API calls
- **Progress Monitoring**: Users need to see which jobs are intentionally skipped during reruns
- **Clean Statistics**: Excluded jobs shouldn't inflate the statistics

## Requirements

### 1. Visual Treatment

- **Greyed out with strikethrough** for excluded jobs
- **Different icon**: Use `Minus` or `SkipForward` instead of clock
- **Muted colors**: Gray background, lighter text
- **Show in both compact and detailed views**

### 2. Status Hierarchy

```typescript
// Current: failed > needs_approval > processing > waiting > completed
// New: failed > needs_approval > processing > waiting > completed
// Excluded jobs are filtered OUT of counts entirely
```

### 3. Counting Logic

- **Excluded jobs = 0 contribution** to all statistics
- **Overview counts**: Only count non-excluded jobs
- **Pipeline step counts**: Only count non-excluded jobs
- **Progress bars**: Only show non-excluded jobs
- **Both compact and detailed views**: Show excluded jobs with visual treatment

### 4. Detailed View Information

Show explanatory text in the detailed view (no tooltips needed):

- "Excluded: Job not needed for this rerun"
- "Skipped: No changes detected since last run"
- "Not applicable: Missing required data"

## Implementation Plan

### Step 1: API Investigation (Pending)

Need to determine from API:

1. **What field/flag indicates exclusion?** (`excluded`, `skipped`, `status`, etc.)
2. **Are there different exclusion reasons?** (rerun optimization, missing data, etc.)
3. **Is exclusion permanent or temporary?** (always excluded vs. excluded for this run)

### Step 2: Type Updates

```typescript
// Add to SwimlaneStatusType
export type SwimlaneStatusType =
  | "completed"
  | "needs_approval"
  | "processing"
  | "waiting"
  | "failed"
  | "excluded"; // NEW
```

### Step 3: Detection Logic

```typescript
function isExcluded(job: QueueJob): boolean {
  // Implementation depends on API investigation
  return (
    job.data?.excluded === true ||
    job.data?.skipped === true ||
    job.data?.status === "excluded"
  );
}
```

### Step 4: Status Function Updates

```typescript
// Update getJobStatus() in workflow-utils.ts
export function getJobStatus(job: any): SwimlaneStatusType {
  if (!job) return "waiting";

  // Check for exclusion first
  if (isExcluded(job)) return "excluded";

  // ... rest of existing logic
}
```

### Step 5: Filtering Updates

```typescript
// In all counting functions, filter out excluded jobs first
const relevantJobs = jobs.filter((job) => !isExcluded(job));

// Update these functions:
// - calculateStepJobStats()
// - calculateOverallStats()
// - getJobsForStep()
```

### Step 6: UI Component Updates

#### Status Configuration

```typescript
// Add to status-config.tsx
excluded: {
  label: "Excluded",
  icon: Minus, // or SkipForward
  colors: {
    text: "text-gray-02",
    background: "bg-gray-02/30",
    border: "border-gray-02",
    icon: "text-gray-02",
    iconCompact: "text-gray-02",
  },
}
```

#### Visual Treatment

- **Compact view**: Greyed out button with strikethrough text
- **Detailed view**: Greyed out row with strikethrough text and explanation
- **Progress bars**: Excluded jobs don't contribute to segments

#### Component Updates

- Update `getStatusDisplay()` for excluded state
- Update `PipelineProgressBar` to exclude excluded jobs
- Update `StatCard` and `CompactStatCard` components
- Update `MultiProgressBar` component

### Step 7: Files to Modify

1. `src/lib/types.ts` - Add "excluded" to SwimlaneStatusType
2. `src/lib/status-config.tsx` - Add excluded status configuration
3. `src/lib/workflow-utils.ts` - Update getJobStatus() and filtering logic
4. `src/components/jobStatus/swimlane-queue-status.tsx` - Update UI rendering
5. `src/components/ui/stat-cards.tsx` - Update stat card components
6. `src/components/ui/multi-progress-bar.tsx` - Update progress bar logic

## Testing Considerations

- Test with jobs that have exclusion flags
- Verify excluded jobs don't appear in counts
- Verify excluded jobs appear with correct visual treatment
- Test different exclusion reasons display correctly
- Verify progress bars exclude excluded jobs

## Dependencies

- **API Investigation**: Must determine how exclusion is indicated in the API response
- **Backend Confirmation**: Confirm exclusion logic and field names

## Status

🟡 **Pending API Investigation** - Waiting for confirmation on how excluded jobs are indicated in the API response.
