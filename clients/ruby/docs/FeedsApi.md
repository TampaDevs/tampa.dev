# TampaEventsAPI::FeedsApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**call_20260125_feed_get**](FeedsApi.md#call_20260125_feed_get) | **GET** /2026-01-25/feed | Get RSS feed (alias) |
| [**call_20260125_ical_get**](FeedsApi.md#call_20260125_ical_get) | **GET** /2026-01-25/ical | Get iCalendar feed (alias) |
| [**call_20260125_ics_get**](FeedsApi.md#call_20260125_ics_get) | **GET** /2026-01-25/ics | Get iCalendar feed |
| [**call_20260125_rss_get**](FeedsApi.md#call_20260125_rss_get) | **GET** /2026-01-25/rss | Get RSS feed |
| [**call_20260125_webcal_get**](FeedsApi.md#call_20260125_webcal_get) | **GET** /2026-01-25/webcal | Get webcal feed |


## call_20260125_feed_get

> String call_20260125_feed_get(opts)

Get RSS feed (alias)

Alias for /rss - returns events as an RSS 2.0 feed

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::FeedsApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # Get RSS feed (alias)
  result = api_instance.call_20260125_feed_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FeedsApi->call_20260125_feed_get: #{e}"
end
```

#### Using the call_20260125_feed_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(String, Integer, Hash)> call_20260125_feed_get_with_http_info(opts)

```ruby
begin
  # Get RSS feed (alias)
  data, status_code, headers = api_instance.call_20260125_feed_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => String
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FeedsApi->call_20260125_feed_get_with_http_info: #{e}"
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

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/rss+xml


## call_20260125_ical_get

> String call_20260125_ical_get(opts)

Get iCalendar feed (alias)

Alias for /ics - returns events as an iCalendar (.ics) feed

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::FeedsApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # Get iCalendar feed (alias)
  result = api_instance.call_20260125_ical_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FeedsApi->call_20260125_ical_get: #{e}"
end
```

#### Using the call_20260125_ical_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(String, Integer, Hash)> call_20260125_ical_get_with_http_info(opts)

```ruby
begin
  # Get iCalendar feed (alias)
  data, status_code, headers = api_instance.call_20260125_ical_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => String
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FeedsApi->call_20260125_ical_get_with_http_info: #{e}"
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

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/calendar


## call_20260125_ics_get

> String call_20260125_ics_get(opts)

Get iCalendar feed

Returns events as an iCalendar (.ics) feed

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::FeedsApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # Get iCalendar feed
  result = api_instance.call_20260125_ics_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FeedsApi->call_20260125_ics_get: #{e}"
end
```

#### Using the call_20260125_ics_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(String, Integer, Hash)> call_20260125_ics_get_with_http_info(opts)

```ruby
begin
  # Get iCalendar feed
  data, status_code, headers = api_instance.call_20260125_ics_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => String
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FeedsApi->call_20260125_ics_get_with_http_info: #{e}"
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

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/calendar


## call_20260125_rss_get

> String call_20260125_rss_get(opts)

Get RSS feed

Returns events as an RSS 2.0 feed

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::FeedsApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # Get RSS feed
  result = api_instance.call_20260125_rss_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FeedsApi->call_20260125_rss_get: #{e}"
end
```

#### Using the call_20260125_rss_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(String, Integer, Hash)> call_20260125_rss_get_with_http_info(opts)

```ruby
begin
  # Get RSS feed
  data, status_code, headers = api_instance.call_20260125_rss_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => String
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FeedsApi->call_20260125_rss_get_with_http_info: #{e}"
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

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/rss+xml


## call_20260125_webcal_get

> String call_20260125_webcal_get(opts)

Get webcal feed

Returns events as an iCalendar feed (same as /ics, for webcal:// protocol)

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::FeedsApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # Get webcal feed
  result = api_instance.call_20260125_webcal_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FeedsApi->call_20260125_webcal_get: #{e}"
end
```

#### Using the call_20260125_webcal_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(String, Integer, Hash)> call_20260125_webcal_get_with_http_info(opts)

```ruby
begin
  # Get webcal feed
  data, status_code, headers = api_instance.call_20260125_webcal_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => String
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FeedsApi->call_20260125_webcal_get_with_http_info: #{e}"
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

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/calendar

