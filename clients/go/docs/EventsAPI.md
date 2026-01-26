# \EventsAPI

All URIs are relative to *https://events.api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**Call20260125EventsGet**](EventsAPI.md#Call20260125EventsGet) | **Get** /2026-01-25/events | Get all events
[**Call20260125EventsNextGet**](EventsAPI.md#Call20260125EventsNextGet) | **Get** /2026-01-25/events/next | Get next event per group



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

No authorization required

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

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json, text/plain

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

