# \ScopesAPI

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**V1ScopesGet**](ScopesAPI.md#V1ScopesGet) | **Get** /v1/scopes | List OAuth scopes



## V1ScopesGet

> VVV1ScopesGet200Response V1ScopesGet(ctx).Execute()

List OAuth scopes



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
	resp, r, err := apiClient.ScopesAPI.V1ScopesGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ScopesAPI.V1ScopesGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ScopesGet`: VVV1ScopesGet200Response
	fmt.Fprintf(os.Stdout, "Response from `ScopesAPI.V1ScopesGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV1ScopesGetRequest struct via the builder pattern


### Return type

[**VVV1ScopesGet200Response**](VV1ScopesGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

