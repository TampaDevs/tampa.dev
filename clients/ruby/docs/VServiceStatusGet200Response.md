# TampaEventsAPI::VServiceStatusGet200Response

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **platforms** | [**Array&lt;VServiceStatusGet200ResponsePlatformsInner&gt;**](VServiceStatusGet200ResponsePlatformsInner.md) |  |  |
| **groups** | [**Array&lt;VServiceStatusGet200ResponseGroupsInner&gt;**](VServiceStatusGet200ResponseGroupsInner.md) |  |  |
| **total_groups** | **Float** |  |  |
| **aggregation** | [**VServiceStatusGet200ResponseAggregation**](VServiceStatusGet200ResponseAggregation.md) |  |  |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VServiceStatusGet200Response.new(
  platforms: null,
  groups: null,
  total_groups: null,
  aggregation: null
)
```

