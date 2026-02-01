# TampaEventsAPI::VTokenCreated

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **id** | **String** |  |  |
| **name** | **String** |  |  |
| **token** | **String** | Full token value. Store securely — it cannot be retrieved again. |  |
| **token_prefix** | **String** |  |  |
| **scopes** | **String** |  |  |
| **expires_at** | **String** |  |  |
| **created_at** | **String** |  |  |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VTokenCreated.new(
  id: null,
  name: null,
  token: null,
  token_prefix: null,
  scopes: null,
  expires_at: null,
  created_at: null
)
```

