# \ClaimsAPI

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**V1ClaimCodeGet**](ClaimsAPI.md#V1ClaimCodeGet) | **Get** /v1/claim/{code} | Get badge claim info
[**V1ClaimCodePost**](ClaimsAPI.md#V1ClaimCodePost) | **Post** /v1/claim/{code} | Claim a badge



## V1ClaimCodeGet

> VVV1ClaimCodeGet200Response V1ClaimCodeGet(ctx, code).Execute()

Get badge claim info



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
	code := "code_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ClaimsAPI.V1ClaimCodeGet(context.Background(), code).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ClaimsAPI.V1ClaimCodeGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ClaimCodeGet`: VVV1ClaimCodeGet200Response
	fmt.Fprintf(os.Stdout, "Response from `ClaimsAPI.V1ClaimCodeGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**code** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1ClaimCodeGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VVV1ClaimCodeGet200Response**](VV1ClaimCodeGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1ClaimCodePost

> VVV1ClaimCodePost201Response V1ClaimCodePost(ctx, code).Execute()

Claim a badge



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
	code := "code_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.ClaimsAPI.V1ClaimCodePost(context.Background(), code).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `ClaimsAPI.V1ClaimCodePost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ClaimCodePost`: VVV1ClaimCodePost201Response
	fmt.Fprintf(os.Stdout, "Response from `ClaimsAPI.V1ClaimCodePost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**code** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1ClaimCodePostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VVV1ClaimCodePost201Response**](VV1ClaimCodePost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

