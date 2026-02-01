# TampaEventsAPI::ScopesApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**v1_scopes_get**](ScopesApi.md#v1_scopes_get) | **GET** /v1/scopes | List OAuth scopes |


## v1_scopes_get

> <VV1ScopesGet200Response> v1_scopes_get

List OAuth scopes

Returns all available OAuth scopes with descriptions and hierarchy. No authentication required.

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::ScopesApi.new

begin
  # List OAuth scopes
  result = api_instance.v1_scopes_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling ScopesApi->v1_scopes_get: #{e}"
end
```

#### Using the v1_scopes_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ScopesGet200Response>, Integer, Hash)> v1_scopes_get_with_http_info

```ruby
begin
  # List OAuth scopes
  data, status_code, headers = api_instance.v1_scopes_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ScopesGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling ScopesApi->v1_scopes_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1ScopesGet200Response**](VV1ScopesGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

