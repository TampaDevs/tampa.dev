# TampaEventsAPI::VServiceStatusGet200ResponseAggregation

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **last_run_at** | **String** |  |  |
| **duration_ms** | **Float** |  |  |
| **groups_processed** | **Float** |  |  |
| **groups_failed** | **Float** |  |  |
| **data_hash** | **String** |  |  |
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

