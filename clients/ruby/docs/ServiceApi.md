# TampaEventsAPI::ServiceApi

All URIs are relative to *https://events.api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**service_status_get**](ServiceApi.md#service_status_get) | **GET** /service/status | Service status |


## service_status_get

> <ServiceStatusGet200Response> service_status_get

Service status

Returns service status and configuration information, including platforms, groups, and aggregation diagnostics.

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::ServiceApi.new

begin
  # Service status
  result = api_instance.service_status_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling ServiceApi->service_status_get: #{e}"
end
```

#### Using the service_status_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<ServiceStatusGet200Response>, Integer, Hash)> service_status_get_with_http_info

```ruby
begin
  # Service status
  data, status_code, headers = api_instance.service_status_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <ServiceStatusGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling ServiceApi->service_status_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**ServiceStatusGet200Response**](ServiceStatusGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

