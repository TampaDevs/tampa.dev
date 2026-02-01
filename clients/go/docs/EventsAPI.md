# \EventsAPI

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**Call20260125EventsGet**](EventsAPI.md#Call20260125EventsGet) | **Get** /2026-01-25/events | Get all events
[**Call20260125EventsNextGet**](EventsAPI.md#Call20260125EventsNextGet) | **Get** /2026-01-25/events/next | Get next event per group
[**V1CheckinCodePost**](EventsAPI.md#V1CheckinCodePost) | **Post** /v1/checkin/{code} | Check in to event
[**V1EventsEventIdRsvpDelete**](EventsAPI.md#V1EventsEventIdRsvpDelete) | **Delete** /v1/events/{eventId}/rsvp | Cancel RSVP
[**V1EventsEventIdRsvpGet**](EventsAPI.md#V1EventsEventIdRsvpGet) | **Get** /v1/events/{eventId}/rsvp | Get RSVP status
[**V1EventsEventIdRsvpPost**](EventsAPI.md#V1EventsEventIdRsvpPost) | **Post** /v1/events/{eventId}/rsvp | RSVP to event
[**V1EventsEventIdRsvpSummaryGet**](EventsAPI.md#V1EventsEventIdRsvpSummaryGet) | **Get** /v1/events/{eventId}/rsvp-summary | Get RSVP summary
[**V1EventsGet**](EventsAPI.md#V1EventsGet) | **Get** /v1/events | List upcoming events



## Call20260125EventsGet

> []VV20260125EventsGet200ResponseInner Call20260125EventsGet(ctx).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()

Get all events



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
	groups := "tampadevs,suncoast-js" // string |  (optional)
	noonline := "1" // string |  (optional)
	withinHours := "24" // string |  (optional)
	withinDays := "7" // string |  (optional)
	noempty := "1" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.EventsAPI.Call20260125EventsGet(context.Background()).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `EventsAPI.Call20260125EventsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125EventsGet`: []VV20260125EventsGet200ResponseInner
	fmt.Fprintf(os.Stdout, "Response from `EventsAPI.Call20260125EventsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125EventsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groups** | **string** |  | 
 **noonline** | **string** |  | 
 **withinHours** | **string** |  | 
 **withinDays** | **string** |  | 
 **noempty** | **string** |  | 

### Return type

[**[]VV20260125EventsGet200ResponseInner**](V20260125EventsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json, text/plain

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## Call20260125EventsNextGet

> []VV20260125EventsGet200ResponseInner Call20260125EventsNextGet(ctx).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()

Get next event per group



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
	groups := "tampadevs,suncoast-js" // string |  (optional)
	noonline := "1" // string |  (optional)
	withinHours := "24" // string |  (optional)
	withinDays := "7" // string |  (optional)
	noempty := "1" // string |  (optional)

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.EventsAPI.Call20260125EventsNextGet(context.Background()).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `EventsAPI.Call20260125EventsNextGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125EventsNextGet`: []VV20260125EventsGet200ResponseInner
	fmt.Fprintf(os.Stdout, "Response from `EventsAPI.Call20260125EventsNextGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125EventsNextGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groups** | **string** |  | 
 **noonline** | **string** |  | 
 **withinHours** | **string** |  | 
 **withinDays** | **string** |  | 
 **noempty** | **string** |  | 

### Return type

[**[]VV20260125EventsGet200ResponseInner**](V20260125EventsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json, text/plain

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1CheckinCodePost

> VVV1CheckinCodePost201Response V1CheckinCodePost(ctx, code).Execute()

Check in to event



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
	resp, r, err := apiClient.EventsAPI.V1CheckinCodePost(context.Background(), code).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `EventsAPI.V1CheckinCodePost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1CheckinCodePost`: VVV1CheckinCodePost201Response
	fmt.Fprintf(os.Stdout, "Response from `EventsAPI.V1CheckinCodePost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**code** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1CheckinCodePostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VVV1CheckinCodePost201Response**](VV1CheckinCodePost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1EventsEventIdRsvpDelete

> VVV1EventsEventIdRsvpDelete200Response V1EventsEventIdRsvpDelete(ctx, eventId).Execute()

Cancel RSVP



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
	eventId := "eventId_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.EventsAPI.V1EventsEventIdRsvpDelete(context.Background(), eventId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `EventsAPI.V1EventsEventIdRsvpDelete``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1EventsEventIdRsvpDelete`: VVV1EventsEventIdRsvpDelete200Response
	fmt.Fprintf(os.Stdout, "Response from `EventsAPI.V1EventsEventIdRsvpDelete`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**eventId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1EventsEventIdRsvpDeleteRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VVV1EventsEventIdRsvpDelete200Response**](VV1EventsEventIdRsvpDelete200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1EventsEventIdRsvpGet

> VVV1EventsEventIdRsvpGet200Response V1EventsEventIdRsvpGet(ctx, eventId).Execute()

Get RSVP status



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
	eventId := "eventId_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.EventsAPI.V1EventsEventIdRsvpGet(context.Background(), eventId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `EventsAPI.V1EventsEventIdRsvpGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1EventsEventIdRsvpGet`: VVV1EventsEventIdRsvpGet200Response
	fmt.Fprintf(os.Stdout, "Response from `EventsAPI.V1EventsEventIdRsvpGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**eventId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1EventsEventIdRsvpGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VVV1EventsEventIdRsvpGet200Response**](VV1EventsEventIdRsvpGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1EventsEventIdRsvpPost

> VVV1EventsEventIdRsvpPost201Response V1EventsEventIdRsvpPost(ctx, eventId).Execute()

RSVP to event



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
	eventId := "eventId_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.EventsAPI.V1EventsEventIdRsvpPost(context.Background(), eventId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `EventsAPI.V1EventsEventIdRsvpPost``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1EventsEventIdRsvpPost`: VVV1EventsEventIdRsvpPost201Response
	fmt.Fprintf(os.Stdout, "Response from `EventsAPI.V1EventsEventIdRsvpPost`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**eventId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1EventsEventIdRsvpPostRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VVV1EventsEventIdRsvpPost201Response**](VV1EventsEventIdRsvpPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1EventsEventIdRsvpSummaryGet

> VVV1EventsEventIdRsvpSummaryGet200Response V1EventsEventIdRsvpSummaryGet(ctx, eventId).Execute()

Get RSVP summary



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
	eventId := "eventId_example" // string | 

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.EventsAPI.V1EventsEventIdRsvpSummaryGet(context.Background(), eventId).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `EventsAPI.V1EventsEventIdRsvpSummaryGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1EventsEventIdRsvpSummaryGet`: VVV1EventsEventIdRsvpSummaryGet200Response
	fmt.Fprintf(os.Stdout, "Response from `EventsAPI.V1EventsEventIdRsvpSummaryGet`: %v\n", resp)
}
```

### Path Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
**ctx** | **context.Context** | context for authentication, logging, cancellation, deadlines, tracing, etc.
**eventId** | **string** |  | 

### Other Parameters

Other parameters are passed through a pointer to a apiV1EventsEventIdRsvpSummaryGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------


### Return type

[**VVV1EventsEventIdRsvpSummaryGet200Response**](VV1EventsEventIdRsvpSummaryGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## V1EventsGet

> VVV1EventsGet200Response V1EventsGet(ctx).Limit(limit).Offset(offset).Execute()

List upcoming events



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
	resp, r, err := apiClient.EventsAPI.V1EventsGet(context.Background()).Limit(limit).Offset(offset).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `EventsAPI.V1EventsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `V1EventsGet`: VVV1EventsGet200Response
	fmt.Fprintf(os.Stdout, "Response from `EventsAPI.V1EventsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiV1EventsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **float32** |  | [default to 20]
 **offset** | **float32** |  | [default to 0]

### Return type

[**VVV1EventsGet200Response**](VV1EventsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

