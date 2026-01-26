# \ServiceAPI

All URIs are relative to *https://events.api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**ServiceStatusGet**](ServiceAPI.md#ServiceStatusGet) | **Get** /service/status | Service status



## ServiceStatusGet

> VVServiceStatusGet200Response ServiceStatusGet(ctx).Execute()

Service status



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
	resp, r, err := apiClient.ServiceAPI.ServiceStatusGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ServiceAPI.ServiceStatusGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `ServiceStatusGet`: VVServiceStatusGet200Response
	fmt.Fprintf(os.Stdout, "Response from `ServiceAPI.ServiceStatusGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiServiceStatusGetRequest struct via the builder pattern


### Return type

[**VVServiceStatusGet200Response**](VServiceStatusGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

