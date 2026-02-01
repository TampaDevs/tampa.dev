# \SchemasAPI

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**Call20260125SchemasGet**](SchemasAPI.md#Call20260125SchemasGet) | **Get** /2026-01-25/schemas | List all JSON schemas
[**Call20260125SchemasNameGet**](SchemasAPI.md#Call20260125SchemasNameGet) | **Get** /2026-01-25/schemas/{name} | Get specific JSON schema



## Call20260125SchemasGet

> VV20260125SchemasGet200Response Call20260125SchemasGet(ctx).Execute()

List all JSON schemas



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
	resp, r, err := apiClient.SchemasAPI.Call20260125SchemasGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `SchemasAPI.Call20260125SchemasGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125SchemasGet`: VV20260125SchemasGet200Response
	fmt.Fprintf(os.Stdout, "Response from `SchemasAPI.Call20260125SchemasGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125SchemasGetRequest struct via the builder pattern


### Return type

[**VV20260125SchemasGet200Response**](V20260125SchemasGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## Call20260125SchemasNameGet

> interface{} Call20260125SchemasNameGet(ctx, name).Execute()

Get specific JSON schema



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
	name := "event" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.SchemasAPI.Call20260125SchemasNameGet(context.Background(), name).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `SchemasAPI.Call20260125SchemasNameGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125SchemasNameGet`: interface{}
	fmt.Fprintf(os.Stdout, "Response from `SchemasAPI.Call20260125SchemasNameGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**name** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125SchemasNameGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

**interface{}**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/schema+json, application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

