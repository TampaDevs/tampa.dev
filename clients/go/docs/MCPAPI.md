# \MCPAPI

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**McpDelete**](MCPAPI.md#McpDelete) | **Delete** /mcp | MCP session termination
[**McpGet**](MCPAPI.md#McpGet) | **Get** /mcp | MCP SSE endpoint (not supported)
[**McpPost**](MCPAPI.md#McpPost) | **Post** /mcp | MCP JSON-RPC endpoint



## McpDelete

> McpDelete(ctx).Execute()

MCP session termination



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.MCPAPI.McpDelete(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MCPAPI.McpDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiMcpDeleteRequest struct via the builder pattern


### Return type

 (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## McpGet

> McpGet(ctx).Execute()

MCP SSE endpoint (not supported)



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.MCPAPI.McpGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MCPAPI.McpGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiMcpGetRequest struct via the builder pattern


### Return type

 (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## McpPost

> interface{} McpPost(ctx).Execute()

MCP JSON-RPC endpoint



### Example

```go
package main

import (
	"context"
	"fmt"
	"os"
	openapiclient "github.com/GIT_USER_ID/GIT_REPO_ID"
)

func main() {

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.MCPAPI.McpPost(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `MCPAPI.McpPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `McpPost`: interface{}
	fmt.Fprintf(os.Stdout, "Response from `MCPAPI.McpPost`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiMcpPostRequest struct via the builder pattern


### Return type

**interface{}**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

