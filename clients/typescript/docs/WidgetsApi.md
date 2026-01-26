# WidgetsApi

All URIs are relative to *https://events.api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**widgetCarouselGet**](#widgetcarouselget) | **GET** /widget/carousel | Carousel HTML widget|
|[**widgetNextEventGet**](#widgetnexteventget) | **GET** /widget/next-event | Next event HTML widget|

# **widgetCarouselGet**
> string widgetCarouselGet()

Returns an HTML carousel widget showing upcoming events

### Example

```typescript
import {
    WidgetsApi,
    Configuration
} from '@tampa-devs/events-api-client';

const configuration = new Configuration();
const apiInstance = new WidgetsApi(configuration);

let groups: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.widgetCarouselGet(
    groups
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **groups** | [**string**] |  | (optional) defaults to undefined|


### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/html


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTML carousel widget |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **widgetNextEventGet**
> string widgetNextEventGet()

Returns an HTML widget showing the next upcoming event

### Example

```typescript
import {
    WidgetsApi,
    Configuration
} from '@tampa-devs/events-api-client';

const configuration = new Configuration();
const apiInstance = new WidgetsApi(configuration);

let groups: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.widgetNextEventGet(
    groups
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **groups** | [**string**] |  | (optional) defaults to undefined|


### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/html


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTML widget |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

