# TampaEventsAPI::V20260125EventsGet200ResponseInner

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **id** | **String** |  |  |
| **title** | **String** |  |  |
| **description** | **String** |  | [optional] |
| **date_time** | **String** |  |  |
| **duration** | **String** |  | [optional] |
| **event_url** | **String** |  |  |
| **status** | **String** |  |  |
| **event_type** | **String** |  | [optional] |
| **rsvp_count** | **Float** |  |  |
| **venues** | **Array&lt;Object&gt;** |  |  |
| **photo** | **Object** |  | [optional] |
| **group** | **Object** |  | [optional] |
| **address** | **String** |  | [optional] |
| **google_maps_url** | **String** |  | [optional] |
| **apple_maps_url** | **String** |  | [optional] |
| **photo_url** | **String** |  | [optional] |
| **is_online** | **Boolean** |  |  |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::V20260125EventsGet200ResponseInner.new(
  id: null,
  title: null,
  description: null,
  date_time: null,
  duration: null,
  event_url: null,
  status: null,
  event_type: null,
  rsvp_count: null,
  venues: null,
  photo: null,
  group: null,
  address: null,
  google_maps_url: null,
  apple_maps_url: null,
  photo_url: null,
  is_online: null
)
```

