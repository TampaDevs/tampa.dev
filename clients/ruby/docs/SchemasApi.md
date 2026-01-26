# TampaEventsAPI::SchemasApi

All URIs are relative to *https://events.api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**call_20260125_schemas_get**](SchemasApi.md#call_20260125_schemas_get) | **GET** /2026-01-25/schemas | List all JSON schemas |
| [**call_20260125_schemas_name_get**](SchemasApi.md#call_20260125_schemas_name_get) | **GET** /2026-01-25/schemas/{name} | Get specific JSON schema |


## call_20260125_schemas_get

> <20260125SchemasGet200Response> call_20260125_schemas_get

List all JSON schemas

Returns metadata about all available JSON schemas for the API models

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::SchemasApi.new

begin
  # List all JSON schemas
  result = api_instance.call_20260125_schemas_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling SchemasApi->call_20260125_schemas_get: #{e}"
end
```

#### Using the call_20260125_schemas_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<20260125SchemasGet200Response>, Integer, Hash)> call_20260125_schemas_get_with_http_info

```ruby
begin
  # List all JSON schemas
  data, status_code, headers = api_instance.call_20260125_schemas_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <20260125SchemasGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling SchemasApi->call_20260125_schemas_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**20260125SchemasGet200Response**](20260125SchemasGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## call_20260125_schemas_name_get

> Object call_20260125_schemas_name_get(name)

Get specific JSON schema

Returns the JSON Schema for a specific model type

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::SchemasApi.new
name = 'event' # String | 

begin
  # Get specific JSON schema
  result = api_instance.call_20260125_schemas_name_get(name)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling SchemasApi->call_20260125_schemas_name_get: #{e}"
end
```

#### Using the call_20260125_schemas_name_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(Object, Integer, Hash)> call_20260125_schemas_name_get_with_http_info(name)

```ruby
begin
  # Get specific JSON schema
  data, status_code, headers = api_instance.call_20260125_schemas_name_get_with_http_info(name)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => Object
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling SchemasApi->call_20260125_schemas_name_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **name** | **String** |  |  |

### Return type

**Object**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/schema+json, application/json

