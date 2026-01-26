# TampaEventsAPI::ServiceStatusGet200Response

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **platforms** | [**Array&lt;ServiceStatusGet200ResponsePlatformsInner&gt;**](ServiceStatusGet200ResponsePlatformsInner.md) |  |  |
| **groups** | [**Array&lt;ServiceStatusGet200ResponseGroupsInner&gt;**](ServiceStatusGet200ResponseGroupsInner.md) |  |  |
| **total_groups** | **Float** |  |  |
| **aggregation** | [**ServiceStatusGet200ResponseAggregation**](ServiceStatusGet200ResponseAggregation.md) |  |  |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::ServiceStatusGet200Response.new(
  platforms: null,
  groups: null,
  total_groups: null,
  aggregation: null
)
```

