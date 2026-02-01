# TampaEventsAPI::VCreateTokenRequest

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **name** | **String** | Human-readable name for the token |  |
| **scopes** | **Array&lt;String&gt;** | OAuth scopes to grant to this token |  |
| **expires_in_days** | **Integer** | Token expiry in days (1-365, default: no expiry) | [optional] |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VCreateTokenRequest.new(
  name: null,
  scopes: null,
  expires_in_days: null
)
```

