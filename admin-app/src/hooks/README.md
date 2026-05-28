# Metrics Hooks Documentation

## useUnifiedMetrics (Recommended for New Features)

The `useUnifiedMetrics` hook is the standardized approach for fetching and managing metrics data in new components and features.

### Why Use This Hook?

- **Simplified API**: Single hook for all metrics operations
- **Better Error Handling**: Consistent error states and messaging
- **Optimized Performance**: Built-in caching and retry logic
- **Type Safety**: Full TypeScript support
- **Debug-Friendly**: Comprehensive debugging information

### Basic Usage

```typescript
import { useUnifiedMetrics } from '@/hooks/useUnifiedMetrics';

const MyMetricsComponent = () => {
  const { 
    metrics, 
    loading, 
    error, 
    refetch,
    getWeekStarts 
  } = useUnifiedMetrics({
    teamId: selectedTeam,
    timePeriod: 'last_13_weeks',
    enabled: true
  });

  if (loading) return <div>Loading metrics...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {metrics.map(metric => (
        <div key={metric.id}>{metric.metric_name}</div>
      ))}
    </div>
  );
};
```

### Options

- `teamId`: Required team ID to fetch metrics for
- `timePeriod`: Time period ('last_13_weeks', 'last_26_weeks', etc.)
- `customRange`: Custom date range { start: Date, end: Date }
- `enabled`: Boolean to enable/disable the query

### Return Values

- `metrics`: Array of metrics with owner information
- `loading`: Loading state
- `error`: Error message if any
- `debugInfo`: Debugging information
- `refetch`: Function to manually refetch data
- `getWeekStarts`: Utility for week calculations
- `weekStartDay`: User's preferred week start day

## Current System (Existing Features)

The existing metrics page uses a more complex system with multiple hooks:
- `useUnifiedTeamData`
- `useMetricsPageLogic` 
- `useMetricsPageHandlers`
- `useMetricsPageData`

**Do not modify the existing system** - it's working perfectly and handles complex features like real-time updates, optimistic UI, and drag-and-drop.

## Development Guidelines

1. **New Features**: Always use `useUnifiedMetrics`
2. **Existing Features**: Leave unchanged unless there's a compelling business reason
3. **Documentation**: Update this file when adding new hooks
4. **Testing**: Test unified hooks thoroughly before using in production