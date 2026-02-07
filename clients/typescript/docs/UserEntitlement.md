# VUserEntitlement


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**entitlement** | **string** | Entitlement key (e.g., dev.tampa.group.create) | [default to undefined]
**grantedAt** | **string** | ISO timestamp when entitlement was granted | [default to undefined]
**expiresAt** | **string** | ISO timestamp when entitlement expires, or null if permanent | [default to undefined]
**source** | **string** | How the entitlement was granted (e.g., admin, achievement) | [default to undefined]

## Example

```typescript
import { VUserEntitlement } from '@tampadevs/events-api-client';

const instance: VUserEntitlement = {
    id,
    entitlement,
    grantedAt,
    expiresAt,
    source,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
