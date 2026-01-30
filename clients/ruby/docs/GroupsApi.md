# TampaEventsAPI::GroupsApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**call_20260125_groups_get**](GroupsApi.md#call_20260125_groups_get) | **GET** /2026-01-25/groups | Get all public groups |
| [**call_20260125_groups_slug_get**](GroupsApi.md#call_20260125_groups_slug_get) | **GET** /2026-01-25/groups/{slug} | Get a group by slug |


## call_20260125_groups_get

> <Array<V20260125GroupsGet200ResponseInner>> call_20260125_groups_get(opts)

Get all public groups

Returns a list of all groups displayed on the website

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::GroupsApi.new
opts = {
  featured: '1', # String | 
  tag: 'cloud' # String | 
}

begin
  # Get all public groups
  result = api_instance.call_20260125_groups_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->call_20260125_groups_get: #{e}"
end
```

#### Using the call_20260125_groups_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<V20260125GroupsGet200ResponseInner>>, Integer, Hash)> call_20260125_groups_get_with_http_info(opts)

```ruby
begin
  # Get all public groups
  data, status_code, headers = api_instance.call_20260125_groups_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<V20260125GroupsGet200ResponseInner>>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->call_20260125_groups_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **featured** | **String** |  | [optional] |
| **tag** | **String** |  | [optional] |

### Return type

[**Array&lt;V20260125GroupsGet200ResponseInner&gt;**](V20260125GroupsGet200ResponseInner.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## call_20260125_groups_slug_get

> <V20260125GroupsGet200ResponseInner> call_20260125_groups_slug_get(slug)

Get a group by slug

Returns a single group by its URL slug

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::GroupsApi.new
slug = 'tampadevs' # String | 

begin
  # Get a group by slug
  result = api_instance.call_20260125_groups_slug_get(slug)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->call_20260125_groups_slug_get: #{e}"
end
```

#### Using the call_20260125_groups_slug_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<V20260125GroupsGet200ResponseInner>, Integer, Hash)> call_20260125_groups_slug_get_with_http_info(slug)

```ruby
begin
  # Get a group by slug
  data, status_code, headers = api_instance.call_20260125_groups_slug_get_with_http_info(slug)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <V20260125GroupsGet200ResponseInner>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->call_20260125_groups_slug_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **slug** | **String** |  |  |

### Return type

[**V20260125GroupsGet200ResponseInner**](V20260125GroupsGet200ResponseInner.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

