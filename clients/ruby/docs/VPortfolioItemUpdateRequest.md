# TampaEventsAPI::VPortfolioItemUpdateRequest

## Properties

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **title** | **String** |  | [optional] |
| **description** | **String** |  | [optional] |
| **url** | **String** |  | [optional] |
| **image_url** | **String** |  | [optional] |
| **sort_order** | **Integer** |  | [optional][default to 0] |

## Example

```ruby
require 'tampa_events_api'

instance = TampaEventsAPI::VPortfolioItemUpdateRequest.new(
  title: null,
  description: null,
  url: null,
  image_url: null,
  sort_order: null
)
```

