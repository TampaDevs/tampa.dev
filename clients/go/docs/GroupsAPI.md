# \GroupsAPI

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**Call20260125GroupsGet**](GroupsAPI.md#Call20260125GroupsGet) | **Get** /2026-01-25/groups | Get all public groups
[**Call20260125GroupsSlugGet**](GroupsAPI.md#Call20260125GroupsSlugGet) | **Get** /2026-01-25/groups/{slug} | Get a group by slug



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

No authorization required

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

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

