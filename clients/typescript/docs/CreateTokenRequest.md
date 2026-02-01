# VCreateTokenRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **string** | Human-readable name for the token | [default to undefined]
**scopes** | **Array&lt;string&gt;** | OAuth scopes to grant to this token | [default to undefined]
**expiresInDays** | **number** | Token expiry in days (1-365, default: no expiry) | [optional] [default to undefined]

## Example

```typescript
import { VCreateTokenRequest } from '@tampadevs/events-api-client';

const instance: VCreateTokenRequest = {
    name,
    scopes,
    expiresInDays,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
