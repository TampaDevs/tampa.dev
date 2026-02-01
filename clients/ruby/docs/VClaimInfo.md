# TampaEventsAPI::VClaimInfo

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **badge** | [**VClaimInfoBadge**](VClaimInfoBadge.md) |  |  |
| **group** | [**VClaimInfoGroup**](VClaimInfoGroup.md) |  |  |
| **claimable** | **Boolean** |  |  |
| **reason** | **String** |  | [optional] |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VClaimInfo.new(
  badge: null,
  group: null,
  claimable: null,
  reason: null
)
```

