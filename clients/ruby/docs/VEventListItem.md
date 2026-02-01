# TampaEventsAPI::VEventListItem

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **id** | **String** |  |  |
| **title** | **String** |  |  |
| **description** | **String** |  |  |
| **start_time** | **String** |  |  |
| **end_time** | **String** |  |  |
| **timezone** | **String** |  |  |
| **event_url** | **String** |  |  |
| **photo_url** | **String** |  |  |
| **event_type** | **String** |  |  |
| **rsvp_count** | **Float** |  |  |
| **max_attendees** | **Float** |  |  |
| **group** | [**VEventListItemGroup**](VEventListItemGroup.md) |  |  |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VEventListItem.new(
  id: null,
  title: null,
  description: null,
  start_time: null,
  end_time: null,
  timezone: null,
  event_url: null,
  photo_url: null,
  event_type: null,
  rsvp_count: null,
  max_attendees: null,
  group: null
)
```

