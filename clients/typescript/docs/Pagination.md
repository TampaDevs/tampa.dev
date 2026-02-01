# VPagination


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**total** | **number** | Total number of items (may be absent if count is expensive) | [optional] [default to undefined]
**limit** | **number** | Maximum items per page | [default to undefined]
**offset** | **number** | Number of items skipped | [default to undefined]
**hasMore** | **boolean** | Whether more items exist beyond this page | [default to undefined]

## Example

```typescript
import { VPagination } from '@tampadevs/events-api-client';

const instance: VPagination = {
    total,
    limit,
    offset,
    hasMore,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
