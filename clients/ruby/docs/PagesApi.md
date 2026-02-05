# TampaEventsAPI::PagesApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**html_get**](PagesApi.md#html_get) | **GET** /html | Deprecated — redirects to calendar |
| [**upcoming_events_get**](PagesApi.md#upcoming_events_get) | **GET** /upcoming-events | Deprecated — redirects to calendar |


## html_get

> html_get

Deprecated — redirects to calendar

Formerly returned an HTML page with upcoming events. Now redirects to the calendar.

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

begin
  # Deprecated — redirects to calendar
  api_instance.html_get
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling PagesApi->html_get: #{e}"
end
```

#### Using the html_get_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> html_get_with_http_info

```ruby
begin
  # Deprecated — redirects to calendar
  data, status_code, headers = api_instance.html_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling PagesApi->html_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

nil (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


## upcoming_events_get

> upcoming_events_get

Deprecated — redirects to calendar

Formerly returned an HTML page with upcoming events. Now redirects to the calendar.

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

begin
  # Deprecated — redirects to calendar
  api_instance.upcoming_events_get
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling PagesApi->upcoming_events_get: #{e}"
end
```

#### Using the upcoming_events_get_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> upcoming_events_get_with_http_info

```ruby
begin
  # Deprecated — redirects to calendar
  data, status_code, headers = api_instance.upcoming_events_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling PagesApi->upcoming_events_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

nil (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

