# \FeedsAPI

All URIs are relative to *https://events.api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**Call20260125FeedGet**](FeedsAPI.md#Call20260125FeedGet) | **Get** /2026-01-25/feed | Get RSS feed (alias)
[**Call20260125IcalGet**](FeedsAPI.md#Call20260125IcalGet) | **Get** /2026-01-25/ical | Get iCalendar feed (alias)
[**Call20260125IcsGet**](FeedsAPI.md#Call20260125IcsGet) | **Get** /2026-01-25/ics | Get iCalendar feed
[**Call20260125RssGet**](FeedsAPI.md#Call20260125RssGet) | **Get** /2026-01-25/rss | Get RSS feed
[**Call20260125WebcalGet**](FeedsAPI.md#Call20260125WebcalGet) | **Get** /2026-01-25/webcal | Get webcal feed



## Call20260125FeedGet

> string Call20260125FeedGet(ctx).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()

Get RSS feed (alias)



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
	resp, r, err := apiClient.FeedsAPI.Call20260125FeedGet(context.Background()).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `FeedsAPI.Call20260125FeedGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125FeedGet`: string
	fmt.Fprintf(os.Stdout, "Response from `FeedsAPI.Call20260125FeedGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125FeedGetRequest struct via the builder pattern


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
- **Accept**: application/rss+xml

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## Call20260125IcalGet

> string Call20260125IcalGet(ctx).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()

Get iCalendar feed (alias)



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
	resp, r, err := apiClient.FeedsAPI.Call20260125IcalGet(context.Background()).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `FeedsAPI.Call20260125IcalGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125IcalGet`: string
	fmt.Fprintf(os.Stdout, "Response from `FeedsAPI.Call20260125IcalGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125IcalGetRequest struct via the builder pattern


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
- **Accept**: text/calendar

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## Call20260125IcsGet

> string Call20260125IcsGet(ctx).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()

Get iCalendar feed



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
	resp, r, err := apiClient.FeedsAPI.Call20260125IcsGet(context.Background()).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `FeedsAPI.Call20260125IcsGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125IcsGet`: string
	fmt.Fprintf(os.Stdout, "Response from `FeedsAPI.Call20260125IcsGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125IcsGetRequest struct via the builder pattern


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
- **Accept**: text/calendar

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## Call20260125RssGet

> string Call20260125RssGet(ctx).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()

Get RSS feed



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
	resp, r, err := apiClient.FeedsAPI.Call20260125RssGet(context.Background()).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `FeedsAPI.Call20260125RssGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125RssGet`: string
	fmt.Fprintf(os.Stdout, "Response from `FeedsAPI.Call20260125RssGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125RssGetRequest struct via the builder pattern


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
- **Accept**: application/rss+xml

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)


## Call20260125WebcalGet

> string Call20260125WebcalGet(ctx).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()

Get webcal feed



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
	resp, r, err := apiClient.FeedsAPI.Call20260125WebcalGet(context.Background()).Groups(groups).Noonline(noonline).WithinHours(withinHours).WithinDays(withinDays).Noempty(noempty).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `FeedsAPI.Call20260125WebcalGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `Call20260125WebcalGet`: string
	fmt.Fprintf(os.Stdout, "Response from `FeedsAPI.Call20260125WebcalGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiCall20260125WebcalGetRequest struct via the builder pattern


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
- **Accept**: text/calendar

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints)
[[Back to Model list]](../README.md#documentation-for-models)
[[Back to README]](../README.md)

