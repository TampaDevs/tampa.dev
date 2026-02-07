# TampaEventsAPI::VUserBadge

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **name** | **String** |  |  |
| **slug** | **String** |  |  |
| **description** | **String** |  |  |
| **icon** | **String** |  |  |
| **icon_url** | **String** | URL to the high-quality emoji image, or null if unavailable |  |
| **color** | **String** |  |  |
| **points** | **Float** |  |  |
| **awarded_at** | **String** |  |  |
| **group** | [**VUserBadgeGroup**](VUserBadgeGroup.md) |  |  |
| **rarity** | [**VUserBadgeRarity**](VUserBadgeRarity.md) |  |  |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VUserBadge.new(
  name: null,
  slug: null,
  description: null,
  icon: null,
  icon_url: null,
  color: null,
  points: null,
  awarded_at: null,
  group: null,
  rarity: null
)
```

