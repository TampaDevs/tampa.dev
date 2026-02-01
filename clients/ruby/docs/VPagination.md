# TampaEventsAPI::VPagination

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **total** | **Float** | Total number of items (may be absent if count is expensive) | [optional] |
| **limit** | **Float** | Maximum items per page |  |
| **offset** | **Float** | Number of items skipped |  |
| **has_more** | **Boolean** | Whether more items exist beyond this page |  |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VPagination.new(
  total: null,
  limit: null,
  offset: null,
  has_more: null
)
```

