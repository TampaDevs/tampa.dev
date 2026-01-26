# TampaEventsAPI::VServiceStatusGet200ResponseAggregation

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **last_run_at** | **String** |  | [optional] |
| **duration_ms** | **Float** |  | [optional] |
| **groups_processed** | **Float** |  | [optional] |
| **groups_failed** | **Float** |  | [optional] |
| **data_hash** | **String** |  | [optional] |
| **errors** | **Array&lt;String&gt;** |  |  |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VServiceStatusGet200ResponseAggregation.new(
  last_run_at: null,
  duration_ms: null,
  groups_processed: null,
  groups_failed: null,
  data_hash: null,
  errors: null
)
```

