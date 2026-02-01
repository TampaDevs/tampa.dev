# MCPApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**mcpDelete**](#mcpdelete) | **DELETE** /mcp | MCP session termination|
|[**mcpGet**](#mcpget) | **GET** /mcp | MCP SSE endpoint (not supported)|
|[**mcpPost**](#mcppost) | **POST** /mcp | MCP JSON-RPC endpoint|

# **mcpDelete**
> mcpDelete()

Terminates an MCP session. Sessions are stateless on the server side, so this is a no-op that always returns 204.

### Example

```typescript
import {
    MCPApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new MCPApi(configuration);

const { status, data } = await apiInstance.mcpDelete();
```

### Parameters
This endpoint does not have any parameters.


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
|**204** | No Content — session terminated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **mcpGet**
> mcpGet()

Server-Sent Events endpoint for server-initiated messages. Not implemented — use `POST /mcp` for all MCP communication.

### Example

```typescript
import {
    MCPApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new MCPApi(configuration);

const { status, data } = await apiInstance.mcpGet();
```

### Parameters
This endpoint does not have any parameters.


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
|**400** | Bad Request — SSE not supported |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **mcpPost**
> any mcpPost()

Model Context Protocol (MCP) endpoint using Streamable HTTP transport (spec version `2025-03-26`). Accepts JSON-RPC 2.0 requests for MCP protocol methods. Supports batch requests (up to 10). Notifications (requests without `id`) return 204 No Content.  **Supported methods:** - `initialize` — Capability negotiation and protocol version exchange - `tools/list` — List available tools (filtered by token scopes) - `tools/call` — Execute a tool with validated arguments - `resources/list` — List available resources - `resources/read` — Read a resource by URI - `resources/templates/list` — List URI templates for parameterized resources - `prompts/list` — List available prompt templates - `prompts/get` — Get a prompt template with arguments - `ping` — Health check  **Headers:** Include `Mcp-Session-Id` to maintain session context (echoed back in response).

### Example

```typescript
import {
    MCPApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new MCPApi(configuration);

const { status, data } = await apiInstance.mcpPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**any**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | JSON-RPC 2.0 response (single &#x60;JsonRpcResponse&#x60; object or batch array). Per JSON-RPC 2.0, errors also return 200 with an &#x60;error&#x60; field. |  -  |
|**204** | No Content — notification processed (no response body) |  -  |
|**400** | Bad Request — invalid Content-Type |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

