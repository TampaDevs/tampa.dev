# TampaEventsAPI::MCPApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**mcp_delete**](MCPApi.md#mcp_delete) | **DELETE** /mcp | MCP session termination |
| [**mcp_get**](MCPApi.md#mcp_get) | **GET** /mcp | MCP SSE endpoint (not supported) |
| [**mcp_post**](MCPApi.md#mcp_post) | **POST** /mcp | MCP JSON-RPC endpoint |


## mcp_delete

> mcp_delete

MCP session termination

Terminates an MCP session. Sessions are stateless on the server side, so this is a no-op that always returns 204.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::MCPApi.new

begin
  # MCP session termination
  api_instance.mcp_delete
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling MCPApi->mcp_delete: #{e}"
end
```

#### Using the mcp_delete_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> mcp_delete_with_http_info

```ruby
begin
  # MCP session termination
  data, status_code, headers = api_instance.mcp_delete_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling MCPApi->mcp_delete_with_http_info: #{e}"
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


## mcp_get

> mcp_get

MCP SSE endpoint (not supported)

Server-Sent Events endpoint for server-initiated messages. Not implemented — use `POST /mcp` for all MCP communication.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::MCPApi.new

begin
  # MCP SSE endpoint (not supported)
  api_instance.mcp_get
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling MCPApi->mcp_get: #{e}"
end
```

#### Using the mcp_get_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> mcp_get_with_http_info

```ruby
begin
  # MCP SSE endpoint (not supported)
  data, status_code, headers = api_instance.mcp_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling MCPApi->mcp_get_with_http_info: #{e}"
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
- **Accept**: application/json


## mcp_post

> Object mcp_post

MCP JSON-RPC endpoint

Model Context Protocol (MCP) endpoint using Streamable HTTP transport (spec version `2025-03-26`). Accepts JSON-RPC 2.0 requests for MCP protocol methods. Supports batch requests (up to 10). Notifications (requests without `id`) return 204 No Content.  **Supported methods:** - `initialize` — Capability negotiation and protocol version exchange - `tools/list` — List available tools (filtered by token scopes) - `tools/call` — Execute a tool with validated arguments - `resources/list` — List available resources - `resources/read` — Read a resource by URI - `resources/templates/list` — List URI templates for parameterized resources - `prompts/list` — List available prompt templates - `prompts/get` — Get a prompt template with arguments - `ping` — Health check  **Headers:** Include `Mcp-Session-Id` to maintain session context (echoed back in response).

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::MCPApi.new

begin
  # MCP JSON-RPC endpoint
  result = api_instance.mcp_post
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling MCPApi->mcp_post: #{e}"
end
```

#### Using the mcp_post_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(Object, Integer, Hash)> mcp_post_with_http_info

```ruby
begin
  # MCP JSON-RPC endpoint
  data, status_code, headers = api_instance.mcp_post_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => Object
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling MCPApi->mcp_post_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

**Object**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

