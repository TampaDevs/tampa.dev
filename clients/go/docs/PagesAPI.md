# \PagesAPI

All URIs are relative to *https://events.api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**HtmlGet**](PagesAPI.md#HtmlGet) | **Get** /html | HTML page with upcoming events
[**UpcomingEventsGet**](PagesAPI.md#UpcomingEventsGet) | **Get** /upcoming-events | Upcoming events HTML page



## HtmlGet

> string HtmlGet(ctx).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()

HTML page with upcoming events



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
	resp, r, err := apiClient.PagesAPI.HtmlGet(context.Background()).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PagesAPI.HtmlGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `HtmlGet`: string
	fmt.Fprintf(os.Stdout, "Response from `PagesAPI.HtmlGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiHtmlGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groups** | **string** |  | 
 **noonline** | **string** |  | 
 **withinHours** | **string** |  | 
 **withinDays** | **string** |  | 
 **noempty** | **string** |  | 

### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/html

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## UpcomingEventsGet

> string UpcomingEventsGet(ctx).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()

Upcoming events HTML page



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
	resp, r, err := apiClient.PagesAPI.UpcomingEventsGet(context.Background()).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `PagesAPI.UpcomingEventsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `UpcomingEventsGet`: string
	fmt.Fprintf(os.Stdout, "Response from `PagesAPI.UpcomingEventsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiUpcomingEventsGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groups** | **string** |  | 
 **noonline** | **string** |  | 
 **withinHours** | **string** |  | 
 **withinDays** | **string** |  | 
 **noempty** | **string** |  | 

### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: text/html

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

