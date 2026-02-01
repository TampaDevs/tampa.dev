# \FollowsAPI

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**V1UsersUsernameFollowDelete**](FollowsAPI.md#V1UsersUsernameFollowDelete) | **Delete** /v1/users/{username}/follow | Unfollow user
[**V1UsersUsernameFollowPost**](FollowsAPI.md#V1UsersUsernameFollowPost) | **Post** /v1/users/{username}/follow | Follow user
[**V1UsersUsernameFollowersGet**](FollowsAPI.md#V1UsersUsernameFollowersGet) | **Get** /v1/users/{username}/followers | List followers
[**V1UsersUsernameFollowingGet**](FollowsAPI.md#V1UsersUsernameFollowingGet) | **Get** /v1/users/{username}/following | List following



## V1UsersUsernameFollowDelete

> V1UsersUsernameFollowDelete(ctx, username).Execute()

Unfollow user



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
	username := "username_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.FollowsAPI.V1UsersUsernameFollowDelete(context.Background(), username).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `FollowsAPI.V1UsersUsernameFollowDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**username** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1UsersUsernameFollowDeleteRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


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


## V1UsersUsernameFollowPost

> VVV1UsersUsernameFollowPost200Response V1UsersUsernameFollowPost(ctx, username).Execute()

Follow user



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
	username := "username_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.FollowsAPI.V1UsersUsernameFollowPost(context.Background(), username).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `FollowsAPI.V1UsersUsernameFollowPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1UsersUsernameFollowPost`: VVV1UsersUsernameFollowPost200Response
	fmt.Fprintf(os.Stdout, "Response from `FollowsAPI.V1UsersUsernameFollowPost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**username** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1UsersUsernameFollowPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VVV1UsersUsernameFollowPost200Response**](VV1UsersUsernameFollowPost200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1UsersUsernameFollowersGet

> VVV1UsersUsernameFollowersGet200Response V1UsersUsernameFollowersGet(ctx, username).Limit(limit).Offset(offset).Execute()

List followers



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
	username := "username_example" // string | 
	limit := float32(20) // float32 |  (optional) (default to 20)
	offset := float32(0) // float32 |  (optional) (default to 0)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.FollowsAPI.V1UsersUsernameFollowersGet(context.Background(), username).Limit(limit).Offset(offset).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `FollowsAPI.V1UsersUsernameFollowersGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1UsersUsernameFollowersGet`: VVV1UsersUsernameFollowersGet200Response
	fmt.Fprintf(os.Stdout, "Response from `FollowsAPI.V1UsersUsernameFollowersGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**username** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1UsersUsernameFollowersGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **limit** | **float32** |  | [default to 20]
 **offset** | **float32** |  | [default to 0]

### Return type

[**VVV1UsersUsernameFollowersGet200Response**](VV1UsersUsernameFollowersGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1UsersUsernameFollowingGet

> VVV1UsersUsernameFollowersGet200Response V1UsersUsernameFollowingGet(ctx, username).Limit(limit).Offset(offset).Execute()

List following



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
	username := "username_example" // string | 
	limit := float32(20) // float32 |  (optional) (default to 20)
	offset := float32(0) // float32 |  (optional) (default to 0)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.FollowsAPI.V1UsersUsernameFollowingGet(context.Background(), username).Limit(limit).Offset(offset).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `FollowsAPI.V1UsersUsernameFollowingGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1UsersUsernameFollowingGet`: VVV1UsersUsernameFollowersGet200Response
	fmt.Fprintf(os.Stdout, "Response from `FollowsAPI.V1UsersUsernameFollowingGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**username** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1UsersUsernameFollowingGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **limit** | **float32** |  | [default to 20]
 **offset** | **float32** |  | [default to 0]

### Return type

[**VVV1UsersUsernameFollowersGet200Response**](VV1UsersUsernameFollowersGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

