# \GroupsAPI

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**Call20260125GroupsGet**](GroupsAPI.md#Call20260125GroupsGet) | **Get** /2026-01-25/groups | Get all public groups
[**Call20260125GroupsSlugGet**](GroupsAPI.md#Call20260125GroupsSlugGet) | **Get** /2026-01-25/groups/{slug} | Get a group by slug
[**V1FavoritesGet**](GroupsAPI.md#V1FavoritesGet) | **Get** /v1/favorites | List favorite groups
[**V1FavoritesGroupSlugDelete**](GroupsAPI.md#V1FavoritesGroupSlugDelete) | **Delete** /v1/favorites/{groupSlug} | Remove group from favorites
[**V1FavoritesGroupSlugPost**](GroupsAPI.md#V1FavoritesGroupSlugPost) | **Post** /v1/favorites/{groupSlug} | Add group to favorites
[**V1GroupsGet**](GroupsAPI.md#V1GroupsGet) | **Get** /v1/groups | List groups
[**V1GroupsSlugGet**](GroupsAPI.md#V1GroupsSlugGet) | **Get** /v1/groups/{slug} | Get group details



## Call20260125GroupsGet

> []VV20260125GroupsGet200ResponseInner Call20260125GroupsGet(ctx).Featured(featured).Tag(tag).Execute()

Get all public groups



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
	featured := "1" // string |  (optional)
	tag := "cloud" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.GroupsAPI.Call20260125GroupsGet(context.Background()).Featured(featured).Tag(tag).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `GroupsAPI.Call20260125GroupsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125GroupsGet`: []VV20260125GroupsGet200ResponseInner
	fmt.Fprintf(os.Stdout, "Response from `GroupsAPI.Call20260125GroupsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125GroupsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **featured** | **string** |  | 
 **tag** | **string** |  | 

### Return type

[**[]VV20260125GroupsGet200ResponseInner**](V20260125GroupsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## Call20260125GroupsSlugGet

> VV20260125GroupsGet200ResponseInner Call20260125GroupsSlugGet(ctx, slug).Execute()

Get a group by slug



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
	slug := "tampadevs" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.GroupsAPI.Call20260125GroupsSlugGet(context.Background(), slug).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `GroupsAPI.Call20260125GroupsSlugGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125GroupsSlugGet`: VV20260125GroupsGet200ResponseInner
	fmt.Fprintf(os.Stdout, "Response from `GroupsAPI.Call20260125GroupsSlugGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**slug** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125GroupsSlugGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VV20260125GroupsGet200ResponseInner**](V20260125GroupsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1FavoritesGet

> VVV1FavoritesGet200Response V1FavoritesGet(ctx).Execute()

List favorite groups



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
	resp, r, err := apiClient.GroupsAPI.V1FavoritesGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `GroupsAPI.V1FavoritesGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1FavoritesGet`: VVV1FavoritesGet200Response
	fmt.Fprintf(os.Stdout, "Response from `GroupsAPI.V1FavoritesGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV1FavoritesGetRequest struct via the builder pattern


### Return type

[**VVV1FavoritesGet200Response**](VV1FavoritesGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1FavoritesGroupSlugDelete

> V1FavoritesGroupSlugDelete(ctx, groupSlug).Execute()

Remove group from favorites



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
	groupSlug := "groupSlug_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.GroupsAPI.V1FavoritesGroupSlugDelete(context.Background(), groupSlug).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `GroupsAPI.V1FavoritesGroupSlugDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**groupSlug** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1FavoritesGroupSlugDeleteRequest struct via the builder pattern


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


## V1FavoritesGroupSlugPost

> VVV1FavoritesGroupSlugPost200Response V1FavoritesGroupSlugPost(ctx, groupSlug).Execute()

Add group to favorites



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
	groupSlug := "groupSlug_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.GroupsAPI.V1FavoritesGroupSlugPost(context.Background(), groupSlug).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `GroupsAPI.V1FavoritesGroupSlugPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1FavoritesGroupSlugPost`: VVV1FavoritesGroupSlugPost200Response
	fmt.Fprintf(os.Stdout, "Response from `GroupsAPI.V1FavoritesGroupSlugPost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**groupSlug** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1FavoritesGroupSlugPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VVV1FavoritesGroupSlugPost200Response**](VV1FavoritesGroupSlugPost200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1GroupsGet

> VVV1GroupsGet200Response V1GroupsGet(ctx).Limit(limit).Offset(offset).Execute()

List groups



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
	limit := float32(20) // float32 |  (optional) (default to 20)
	offset := float32(0) // float32 |  (optional) (default to 0)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.GroupsAPI.V1GroupsGet(context.Background()).Limit(limit).Offset(offset).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `GroupsAPI.V1GroupsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1GroupsGet`: VVV1GroupsGet200Response
	fmt.Fprintf(os.Stdout, "Response from `GroupsAPI.V1GroupsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV1GroupsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **float32** |  | [default to 20]
 **offset** | **float32** |  | [default to 0]

### Return type

[**VVV1GroupsGet200Response**](VV1GroupsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1GroupsSlugGet

> VVV1GroupsSlugGet200Response V1GroupsSlugGet(ctx, slug).Execute()

Get group details



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
	slug := "slug_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.GroupsAPI.V1GroupsSlugGet(context.Background(), slug).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `GroupsAPI.V1GroupsSlugGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1GroupsSlugGet`: VVV1GroupsSlugGet200Response
	fmt.Fprintf(os.Stdout, "Response from `GroupsAPI.V1GroupsSlugGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**slug** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1GroupsSlugGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VVV1GroupsSlugGet200Response**](VV1GroupsSlugGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

