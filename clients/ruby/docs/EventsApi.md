# TampaEventsAPI::EventsApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**call_20260125_events_get**](EventsApi.md#call_20260125_events_get) | **GET** /2026-01-25/events | Get all events |
| [**call_20260125_events_next_get**](EventsApi.md#call_20260125_events_next_get) | **GET** /2026-01-25/events/next | Get next event per group |


## call_20260125_events_get

> <Array<V20260125EventsGet200ResponseInner>> call_20260125_events_get(opts)

Get all events

Returns a list of all upcoming events, optionally filtered by query parameters

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::EventsApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # Get all events
  result = api_instance.call_20260125_events_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->call_20260125_events_get: #{e}"
end
```

#### Using the call_20260125_events_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<V20260125EventsGet200ResponseInner>>, Integer, Hash)> call_20260125_events_get_with_http_info(opts)

```ruby
begin
  # Get all events
  data, status_code, headers = api_instance.call_20260125_events_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<V20260125EventsGet200ResponseInner>>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->call_20260125_events_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **groups** | **String** |  | [optional] |
| **noonline** | **String** |  | [optional] |
| **within_hours** | **String** |  | [optional] |
| **within_days** | **String** |  | [optional] |
| **noempty** | **String** |  | [optional] |

### Return type

[**Array&lt;V20260125EventsGet200ResponseInner&gt;**](V20260125EventsGet200ResponseInner.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json, text/plain


## call_20260125_events_next_get

> <Array<V20260125EventsGet200ResponseInner>> call_20260125_events_next_get(opts)

Get next event per group

Returns one upcoming event for each group (the next event)

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::EventsApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # Get next event per group
  result = api_instance.call_20260125_events_next_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->call_20260125_events_next_get: #{e}"
end
```

#### Using the call_20260125_events_next_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<V20260125EventsGet200ResponseInner>>, Integer, Hash)> call_20260125_events_next_get_with_http_info(opts)

```ruby
begin
  # Get next event per group
  data, status_code, headers = api_instance.call_20260125_events_next_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<V20260125EventsGet200ResponseInner>>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->call_20260125_events_next_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **groups** | **String** |  | [optional] |
| **noonline** | **String** |  | [optional] |
| **within_hours** | **String** |  | [optional] |
| **within_days** | **String** |  | [optional] |
| **noempty** | **String** |  | [optional] |

### Return type

[**Array&lt;V20260125EventsGet200ResponseInner&gt;**](V20260125EventsGet200ResponseInner.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json, text/plain

