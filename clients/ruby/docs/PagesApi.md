# TampaEventsAPI::PagesApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**html_get**](PagesApi.md#html_get) | **GET** /html | HTML page with upcoming events |
| [**upcoming_events_get**](PagesApi.md#upcoming_events_get) | **GET** /upcoming-events | Upcoming events HTML page |


## html_get

> String html_get(opts)

HTML page with upcoming events

Returns a formatted HTML page displaying upcoming events

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::PagesApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # HTML page with upcoming events
  result = api_instance.html_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling PagesApi->html_get: #{e}"
end
```

#### Using the html_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(String, Integer, Hash)> html_get_with_http_info(opts)

```ruby
begin
  # HTML page with upcoming events
  data, status_code, headers = api_instance.html_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => String
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling PagesApi->html_get_with_http_info: #{e}"
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

**String**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/html


## upcoming_events_get

> String upcoming_events_get(opts)

Upcoming events HTML page

Alias for /html - returns a formatted HTML page displaying upcoming events

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::PagesApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # Upcoming events HTML page
  result = api_instance.upcoming_events_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling PagesApi->upcoming_events_get: #{e}"
end
```

#### Using the upcoming_events_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(String, Integer, Hash)> upcoming_events_get_with_http_info(opts)

```ruby
begin
  # Upcoming events HTML page
  data, status_code, headers = api_instance.upcoming_events_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => String
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling PagesApi->upcoming_events_get_with_http_info: #{e}"
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

**String**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/html

