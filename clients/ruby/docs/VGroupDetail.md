# TampaEventsAPI::VGroupDetail

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **id** | **String** |  |  |
| **urlname** | **String** |  |  |
| **name** | **String** |  |  |
| **description** | **String** |  |  |
| **link** | **String** |  |  |
| **website** | **String** |  |  |
| **member_count** | **Float** |  |  |
| **photo_url** | **String** |  |  |
| **tags** | **Object** |  | [optional] |
| **social_links** | **Object** |  | [optional] |
| **upcoming_events** | [**Array&lt;VGroupDetailAllOfUpcomingEvents&gt;**](VGroupDetailAllOfUpcomingEvents.md) |  |  |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VGroupDetail.new(
  id: null,
  urlname: null,
  name: null,
  description: null,
  link: null,
  website: null,
  member_count: null,
  photo_url: null,
  tags: null,
  social_links: null,
  upcoming_events: null
)
```

