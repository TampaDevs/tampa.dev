# TampaEventsAPI::VUserEntitlement

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **id** | **String** |  |  |
| **entitlement** | **String** | Entitlement key (e.g., dev.tampa.group.create) |  |
| **granted_at** | **String** | ISO timestamp when entitlement was granted |  |
| **expires_at** | **String** | ISO timestamp when entitlement expires, or null if permanent |  |
| **source** | **String** | How the entitlement was granted (e.g., admin, achievement) |  |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VUserEntitlement.new(
  id: null,
  entitlement: null,
  granted_at: null,
  expires_at: null,
  source: null
)
```

