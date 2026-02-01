# tampa_events_api.MCPApi

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**mcp_delete**](MCPApi.md#mcp_delete) | **DELETE** /mcp | MCP session termination
[**mcp_get**](MCPApi.md#mcp_get) | **GET** /mcp | MCP SSE endpoint (not supported)
[**mcp_post**](MCPApi.md#mcp_post) | **POST** /mcp | MCP JSON-RPC endpoint


# **mcp_delete**
> mcp_delete()

MCP session termination

Terminates an MCP session. Sessions are stateless on the server side, so this is a no-op that always returns 204.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.MCPApi(api_client)

    try:
        # MCP session termination
        api_instance.mcp_delete()
    except Exception as e:
        print("Exception when calling MCPApi->mcp_delete: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**204** | No Content — session terminated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **mcp_get**
> mcp_get()

MCP SSE endpoint (not supported)

Server-Sent Events endpoint for server-initiated messages. Not implemented — use `POST /mcp` for all MCP communication.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.MCPApi(api_client)

    try:
        # MCP SSE endpoint (not supported)
        api_instance.mcp_get()
    except Exception as e:
        print("Exception when calling MCPApi->mcp_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

void (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**400** | Bad Request — SSE not supported |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **mcp_post**
> object mcp_post()

MCP JSON-RPC endpoint

Model Context Protocol (MCP) endpoint using Streamable HTTP transport (spec version `2025-03-26`). Accepts JSON-RPC 2.0 requests for MCP protocol methods. Supports batch requests (up to 10). Notifications (requests without `id`) return 204 No Content.

**Supported methods:**
- `initialize` — Capability negotiation and protocol version exchange
- `tools/list` — List available tools (filtered by token scopes)
- `tools/call` — Execute a tool with validated arguments
- `resources/list` — List available resources
- `resources/read` — Read a resource by URI
- `resources/templates/list` — List URI templates for parameterized resources
- `prompts/list` — List available prompt templates
- `prompts/get` — Get a prompt template with arguments
- `ping` — Health check

**Headers:** Include `Mcp-Session-Id` to maintain session context (echoed back in response).

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.MCPApi(api_client)

    try:
        # MCP JSON-RPC endpoint
        api_response = api_instance.mcp_post()
        print("The response of MCPApi->mcp_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling MCPApi->mcp_post: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

**object**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | JSON-RPC 2.0 response (single &#x60;JsonRpcResponse&#x60; object or batch array). Per JSON-RPC 2.0, errors also return 200 with an &#x60;error&#x60; field. |  -  |
**204** | No Content — notification processed (no response body) |  -  |
**400** | Bad Request — invalid Content-Type |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

