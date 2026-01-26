# TampaEventsAPI::WidgetsApi

All URIs are relative to *https://events.api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**widget_carousel_get**](WidgetsApi.md#widget_carousel_get) | **GET** /widget/carousel | Carousel HTML widget |
| [**widget_next_event_get**](WidgetsApi.md#widget_next_event_get) | **GET** /widget/next-event | Next event HTML widget |


## widget_carousel_get

> String widget_carousel_get(opts)

Carousel HTML widget

Returns an HTML carousel widget showing upcoming events

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::WidgetsApi.new
opts = {
  groups: 'tampadevs,suncoast-js' # String | 
}

begin
  # Carousel HTML widget
  result = api_instance.widget_carousel_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling WidgetsApi->widget_carousel_get: #{e}"
end
```

#### Using the widget_carousel_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(String, Integer, Hash)> widget_carousel_get_with_http_info(opts)

```ruby
begin
  # Carousel HTML widget
  data, status_code, headers = api_instance.widget_carousel_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => String
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling WidgetsApi->widget_carousel_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **groups** | **String** |  | [optional] |

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/html


## widget_next_event_get

> String widget_next_event_get(opts)

Next event HTML widget

Returns an HTML widget showing the next upcoming event

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::WidgetsApi.new
opts = {
  groups: 'tampadevs,suncoast-js' # String | 
}

begin
  # Next event HTML widget
  result = api_instance.widget_next_event_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling WidgetsApi->widget_next_event_get: #{e}"
end
```

#### Using the widget_next_event_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(String, Integer, Hash)> widget_next_event_get_with_http_info(opts)

```ruby
begin
  # Next event HTML widget
  data, status_code, headers = api_instance.widget_next_event_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => String
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling WidgetsApi->widget_next_event_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **groups** | **String** |  | [optional] |

### Return type

**String**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/html

