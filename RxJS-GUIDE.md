# RxJS Stream Flow Guide

## Overview

This application uses RxJS for reactive data processing. Understanding the flow of data through RxJS streams is essential for maintaining and extending the codebase. This guide explains the core concepts and patterns used throughout the application.

## Core Principles

1. **Reactive Programming**: Data flows through streams (Observables) that can be transformed, combined, and consumed.
2. **Declarative Style**: We define what should happen to data, not how it should happen.
3. **Asynchronous by Default**: All operations are non-blocking.
4. **Push-based**: Data is pushed to consumers when it becomes available.

## Common Anti-Patterns to Avoid

❌ **Avoid Blocking Operators**: Never use operators that block the stream or collect all emissions before continuing:
- `toArray()` - Collects all emissions into an array, blocking until the source completes
- `reduce()` - Similar to `toArray()`, waits for completion
- `forEach()` - Blocks execution

❌ **Avoid Imperative State Management**: Don't mix imperative and reactive code:
- Avoid maintaining external state that's updated inside subscribe callbacks
- Don't use global variables that are modified by stream operations

## Recommended Patterns

✅ **Use Declarative Operators**: Transform data using operators:
- `map()`, `filter()`, `mergeMap()`, `switchMap()`, etc.

✅ **Use Subjects for State Management**:
- `BehaviorSubject` for values that need an initial state
- `Subject` for event streams

✅ **Use Scan Instead of Reduce**:
- `scan()` emits intermediate results as they're processed
- `reduce()` only emits when the source completes

✅ **Share Expensive Operations**:
- Use `shareReplay()` to share the result of expensive operations

## Data Flow Architecture

Our application follows this general data flow pattern:

1. **Data Sources**:
   - API calls via `RxHttpClient`
   - User interactions
   - System events

2. **Data Processing**:
   - Transformation via operators
   - Error handling with `catchError`
   - Rate limiting with `RxRateLimiter`

3. **State Management**:
   - `QueueStore` maintains application state using Subjects
   - Components subscribe to state changes

4. **UI Updates**:
   - React components use custom hooks that subscribe to state
   - Components re-render when state changes

## Key Components

### RxRateLimiter

Controls the rate of API requests to prevent overwhelming the server:

```typescript
// Usage example
rateLimiter.throttle(() => api.get('/endpoint'))
  .subscribe(result => console.log(result));
```

### QueueStore

Central state management using RxJS Subjects:

```typescript
// Internal implementation
private queues: Record<string, BehaviorSubject<Queue | null>> = {};
private groupedCompanies$ = new BehaviorSubject<GroupedCompany[]>([]);

// Public API
getGroupedCompanies(): Observable<GroupedCompany[]> {
  return this.groupedCompanies$.asObservable();
}
```

### Custom Hooks

React hooks that connect components to the reactive state:

```typescript
// Example hook
export function useQueueStats() {
  const [stats, setStats] = useState<QueueStatsState>(initialState);

  useEffect(() => {
    const subscription = queueStore.getQueueStats().subscribe(
      newStats => setStats(newStats)
    );

    return () => subscription.unsubscribe();
  }, []);

  return stats;
}
```

## Stream Processing Examples

### Fetching and Processing Queue Jobs

```typescript
// Create an observable from API request
from(fetchQueueJobs(queueName)).pipe(
  // Transform the response
  map(response => response.queue),
  // Handle errors
  catchError(error => {
    console.error(`Error fetching queue ${queueName}:`, error);
    return of(null); // Return fallback value
  }),
  // Share the result with multiple subscribers
  shareReplay(1)
)
```

### Grouping and Aggregating Data

```typescript
// Process jobs from multiple queues
combineLatest(queueObservables).pipe(
  // Flatten jobs from all queues
  mergeMap(queues => from(queues).pipe(
    mergeMap(queue => from(queue.jobs || []))
  )),
  // Group by company
  groupBy(job => job.data.company),
  // Process each group
  mergeMap(group => group.pipe(
    // Use scan instead of reduce to emit partial results
    scan((acc, job) => {
      // Update accumulator with new job
      return { ...acc, jobs: [...acc.jobs, job] };
    }, { company: group.key, jobs: [] })
  )),
  // Collect results without blocking
  scan((acc, companyData) => {
    // Update companies array
    return acc.map(c => 
      c.company === companyData.company ? companyData : c
    );
  }, [] as CompanyData[])
)
```

## Debugging RxJS Streams

Use these operators to debug your streams:

```typescript
myObservable$.pipe(
  tap(value => console.log('Before transformation:', value)),
  map(value => transformValue(value)),
  tap(value => console.log('After transformation:', value))
)
```

## Common Mistakes and Solutions

### Problem: Component not updating with new data

**Mistake**: Using `toArray()` or `reduce()` which only emit when the source completes.

**Solution**: Use `scan()` to emit intermediate results:

```typescript
// ❌ Bad: Only emits when source completes
from(dataSource).pipe(
  reduce((acc, value) => [...acc, value], [])
)

// ✅ Good: Emits with each new value
from(dataSource).pipe(
  scan((acc, value) => [...acc, value], [])
)
```

### Problem: Memory leaks

**Mistake**: Not unsubscribing from observables in React components.

**Solution**: Always return a cleanup function from useEffect:

```typescript
useEffect(() => {
  const subscription = myObservable$.subscribe(value => {
    // Update state
  });
  
  // Clean up on component unmount
  return () => subscription.unsubscribe();
}, []);
```

### Problem: Excessive API calls

**Mistake**: Creating new observables for each subscriber.

**Solution**: Share the result with `shareReplay()`:

```typescript
// ❌ Bad: Each subscriber triggers a new API call
const getUsers = () => from(fetch('/api/users')).pipe(
  map(response => response.json())
);

// ✅ Good: Multiple subscribers share one API call
const getUsers = () => from(fetch('/api/users')).pipe(
  map(response => response.json()),
  shareReplay(1)
);
```

## Best Practices

1. **Always unsubscribe** from subscriptions to prevent memory leaks
2. **Use appropriate operators** for the task at hand
3. **Handle errors** at appropriate levels
4. **Document complex streams** with comments explaining the flow
5. **Test streams** in isolation to ensure correct behavior
6. **Use scan instead of reduce** to emit intermediate results
7. **Share expensive operations** with shareReplay
8. **Avoid blocking operators** like toArray and reduce

By following these patterns and avoiding anti-patterns, we maintain a consistent, reactive approach throughout the application.
