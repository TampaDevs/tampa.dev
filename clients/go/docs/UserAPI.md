# \UserAPI

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**V1MeGet**](UserAPI.md#V1MeGet) | **Get** /v1/me | Get current user identity
[**V1MeLinkedAccountsGet**](UserAPI.md#V1MeLinkedAccountsGet) | **Get** /v1/me/linked-accounts | List linked OAuth accounts
[**V1ProfileAchievementsGet**](UserAPI.md#V1ProfileAchievementsGet) | **Get** /v1/profile/achievements | Get achievement progress
[**V1ProfileGet**](UserAPI.md#V1ProfileGet) | **Get** /v1/profile | Get current user profile
[**V1ProfilePatch**](UserAPI.md#V1ProfilePatch) | **Patch** /v1/profile | Update current user profile
[**V1ProfilePortfolioGet**](UserAPI.md#V1ProfilePortfolioGet) | **Get** /v1/profile/portfolio | List portfolio items
[**V1ProfilePortfolioIdDelete**](UserAPI.md#V1ProfilePortfolioIdDelete) | **Delete** /v1/profile/portfolio/{id} | Delete portfolio item
[**V1ProfilePortfolioIdPatch**](UserAPI.md#V1ProfilePortfolioIdPatch) | **Patch** /v1/profile/portfolio/{id} | Update portfolio item
[**V1ProfilePortfolioPost**](UserAPI.md#V1ProfilePortfolioPost) | **Post** /v1/profile/portfolio | Create portfolio item
[**V1ProfileTokensGet**](UserAPI.md#V1ProfileTokensGet) | **Get** /v1/profile/tokens | List personal access tokens
[**V1ProfileTokensIdDelete**](UserAPI.md#V1ProfileTokensIdDelete) | **Delete** /v1/profile/tokens/{id} | Revoke personal access token
[**V1ProfileTokensPost**](UserAPI.md#V1ProfileTokensPost) | **Post** /v1/profile/tokens | Create personal access token



## V1MeGet

> VVV1MeGet200Response V1MeGet(ctx).Execute()

Get current user identity



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
	resp, r, err := apiClient.UserAPI.V1MeGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1MeGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1MeGet`: VVV1MeGet200Response
	fmt.Fprintf(os.Stdout, "Response from `UserAPI.V1MeGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV1MeGetRequest struct via the builder pattern


### Return type

[**VVV1MeGet200Response**](VV1MeGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1MeLinkedAccountsGet

> VVV1MeLinkedAccountsGet200Response V1MeLinkedAccountsGet(ctx).Execute()

List linked OAuth accounts



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
	resp, r, err := apiClient.UserAPI.V1MeLinkedAccountsGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1MeLinkedAccountsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1MeLinkedAccountsGet`: VVV1MeLinkedAccountsGet200Response
	fmt.Fprintf(os.Stdout, "Response from `UserAPI.V1MeLinkedAccountsGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV1MeLinkedAccountsGetRequest struct via the builder pattern


### Return type

[**VVV1MeLinkedAccountsGet200Response**](VV1MeLinkedAccountsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1ProfileAchievementsGet

> VVV1ProfileAchievementsGet200Response V1ProfileAchievementsGet(ctx).Execute()

Get achievement progress



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
	resp, r, err := apiClient.UserAPI.V1ProfileAchievementsGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1ProfileAchievementsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ProfileAchievementsGet`: VVV1ProfileAchievementsGet200Response
	fmt.Fprintf(os.Stdout, "Response from `UserAPI.V1ProfileAchievementsGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV1ProfileAchievementsGetRequest struct via the builder pattern


### Return type

[**VVV1ProfileAchievementsGet200Response**](VV1ProfileAchievementsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1ProfileGet

> VVV1ProfileGet200Response V1ProfileGet(ctx).Execute()

Get current user profile



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
	resp, r, err := apiClient.UserAPI.V1ProfileGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1ProfileGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ProfileGet`: VVV1ProfileGet200Response
	fmt.Fprintf(os.Stdout, "Response from `UserAPI.V1ProfileGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV1ProfileGetRequest struct via the builder pattern


### Return type

[**VVV1ProfileGet200Response**](VV1ProfileGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1ProfilePatch

> VVV1ProfileGet200Response V1ProfilePatch(ctx).VUpdateProfileRequest(vUpdateProfileRequest).Execute()

Update current user profile



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
	vUpdateProfileRequest := *openapiclient.NewVUpdateProfileRequest() // VUpdateProfileRequest |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.UserAPI.V1ProfilePatch(context.Background()).VUpdateProfileRequest(vUpdateProfileRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1ProfilePatch``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ProfilePatch`: VVV1ProfileGet200Response
	fmt.Fprintf(os.Stdout, "Response from `UserAPI.V1ProfilePatch`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV1ProfilePatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **vUpdateProfileRequest** | [**VUpdateProfileRequest**](VUpdateProfileRequest.md) |  | 

### Return type

[**VVV1ProfileGet200Response**](VV1ProfileGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1ProfilePortfolioGet

> VVV1ProfilePortfolioGet200Response V1ProfilePortfolioGet(ctx).Execute()

List portfolio items



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
	resp, r, err := apiClient.UserAPI.V1ProfilePortfolioGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1ProfilePortfolioGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ProfilePortfolioGet`: VVV1ProfilePortfolioGet200Response
	fmt.Fprintf(os.Stdout, "Response from `UserAPI.V1ProfilePortfolioGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV1ProfilePortfolioGetRequest struct via the builder pattern


### Return type

[**VVV1ProfilePortfolioGet200Response**](VV1ProfilePortfolioGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1ProfilePortfolioIdDelete

> V1ProfilePortfolioIdDelete(ctx, id).Execute()

Delete portfolio item



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
	id := "id_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.UserAPI.V1ProfilePortfolioIdDelete(context.Background(), id).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1ProfilePortfolioIdDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1ProfilePortfolioIdDeleteRequest struct via the builder pattern


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


## V1ProfilePortfolioIdPatch

> VVV1ProfilePortfolioPost201Response V1ProfilePortfolioIdPatch(ctx, id).VPortfolioItemUpdateRequest(vPortfolioItemUpdateRequest).Execute()

Update portfolio item



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
	id := "id_example" // string | 
	vPortfolioItemUpdateRequest := *openapiclient.NewVPortfolioItemUpdateRequest() // VPortfolioItemUpdateRequest |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.UserAPI.V1ProfilePortfolioIdPatch(context.Background(), id).VPortfolioItemUpdateRequest(vPortfolioItemUpdateRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1ProfilePortfolioIdPatch``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ProfilePortfolioIdPatch`: VVV1ProfilePortfolioPost201Response
	fmt.Fprintf(os.Stdout, "Response from `UserAPI.V1ProfilePortfolioIdPatch`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1ProfilePortfolioIdPatchRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------

 **vPortfolioItemUpdateRequest** | [**VPortfolioItemUpdateRequest**](VPortfolioItemUpdateRequest.md) |  | 

### Return type

[**VVV1ProfilePortfolioPost201Response**](VV1ProfilePortfolioPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1ProfilePortfolioPost

> VVV1ProfilePortfolioPost201Response V1ProfilePortfolioPost(ctx).VPortfolioItemRequest(vPortfolioItemRequest).Execute()

Create portfolio item



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
	vPortfolioItemRequest := *openapiclient.NewVPortfolioItemRequest("Title_example") // VPortfolioItemRequest |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.UserAPI.V1ProfilePortfolioPost(context.Background()).VPortfolioItemRequest(vPortfolioItemRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1ProfilePortfolioPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ProfilePortfolioPost`: VVV1ProfilePortfolioPost201Response
	fmt.Fprintf(os.Stdout, "Response from `UserAPI.V1ProfilePortfolioPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV1ProfilePortfolioPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **vPortfolioItemRequest** | [**VPortfolioItemRequest**](VPortfolioItemRequest.md) |  | 

### Return type

[**VVV1ProfilePortfolioPost201Response**](VV1ProfilePortfolioPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1ProfileTokensGet

> VVV1ProfileTokensGet200Response V1ProfileTokensGet(ctx).Execute()

List personal access tokens



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
	resp, r, err := apiClient.UserAPI.V1ProfileTokensGet(context.Background()).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1ProfileTokensGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ProfileTokensGet`: VVV1ProfileTokensGet200Response
	fmt.Fprintf(os.Stdout, "Response from `UserAPI.V1ProfileTokensGet`: %v\n", resp)
}
```

### Path Parameters

This endpoint does not need any parameter.

### Other Parameters

Other parameters are passed through a pointer to a apiV1ProfileTokensGetRequest struct via the builder pattern


### Return type

[**VVV1ProfileTokensGet200Response**](VV1ProfileTokensGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1ProfileTokensIdDelete

> V1ProfileTokensIdDelete(ctx, id).Execute()

Revoke personal access token



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
	id := "id_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	r, err := apiClient.UserAPI.V1ProfileTokensIdDelete(context.Background(), id).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1ProfileTokensIdDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**id** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1ProfileTokensIdDeleteRequest struct via the builder pattern


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


## V1ProfileTokensPost

> VVV1ProfileTokensPost201Response V1ProfileTokensPost(ctx).VCreateTokenRequest(vCreateTokenRequest).Execute()

Create personal access token



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
	vCreateTokenRequest := *openapiclient.NewVCreateTokenRequest("Name_example", []string{"Scopes_example"}) // VCreateTokenRequest |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.UserAPI.V1ProfileTokensPost(context.Background()).VCreateTokenRequest(vCreateTokenRequest).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `UserAPI.V1ProfileTokensPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1ProfileTokensPost`: VVV1ProfileTokensPost201Response
	fmt.Fprintf(os.Stdout, "Response from `UserAPI.V1ProfileTokensPost`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV1ProfileTokensPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **vCreateTokenRequest** | [**VCreateTokenRequest**](VCreateTokenRequest.md) |  | 

### Return type

[**VVV1ProfileTokensPost201Response**](VV1ProfileTokensPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

