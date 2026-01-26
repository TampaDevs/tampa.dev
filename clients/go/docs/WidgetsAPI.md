# \WidgetsAPI

All URIs are relative to *https://events.api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**WidgetCarouselGet**](WidgetsAPI.md#WidgetCarouselGet) | **Get** /widget/carousel | Carousel HTML widget
[**WidgetNextEventGet**](WidgetsAPI.md#WidgetNextEventGet) | **Get** /widget/next-event | Next event HTML widget



## WidgetCarouselGet

> string WidgetCarouselGet(ctx).Groups(groups).Execute()

Carousel HTML widget



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

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.WidgetsAPI.WidgetCarouselGet(context.Background()).Groups(groups).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `WidgetsAPI.WidgetCarouselGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `WidgetCarouselGet`: string
	fmt.Fprintf(os.Stdout, "Response from `WidgetsAPI.WidgetCarouselGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiWidgetCarouselGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groups** | **string** |  | 

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


## WidgetNextEventGet

> string WidgetNextEventGet(ctx).Groups(groups).Execute()

Next event HTML widget



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

	configuration := openapiclient.NewConfiguration()
	apiClient := openapiclient.NewAPIClient(configuration)
	resp, r, err := apiClient.WidgetsAPI.WidgetNextEventGet(context.Background()).Groups(groups).Execute()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `WidgetsAPI.WidgetNextEventGet``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
	}
	// response from `WidgetNextEventGet`: string
	fmt.Fprintf(os.Stdout, "Response from `WidgetsAPI.WidgetNextEventGet`: %v\n", resp)
}
```

### Path Parameters



### Other Parameters

Other parameters are passed through a pointer to a apiWidgetNextEventGetRequest struct via the builder pattern


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groups** | **string** |  | 

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

