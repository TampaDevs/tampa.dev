# TampaEventsAPI::VUpdateProfileRequest

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **name** | **String** |  | [optional] |
| **avatar_url** | **String** |  | [optional] |
| **hero_image_url** | **String** |  | [optional] |
| **theme_color** | **String** |  | [optional] |
| **username** | **String** |  | [optional] |
| **bio** | **String** |  | [optional] |
| **location** | **String** |  | [optional] |
| **social_links** | **Array&lt;String&gt;** |  | [optional] |
| **show_achievements** | **Boolean** |  | [optional] |
| **profile_visibility** | **String** |  | [optional] |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VUpdateProfileRequest.new(
  name: null,
  avatar_url: null,
  hero_image_url: null,
  theme_color: null,
  username: null,
  bio: null,
  location: null,
  social_links: null,
  show_achievements: null,
  profile_visibility: null
)
```

