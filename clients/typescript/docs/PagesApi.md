# PagesApi

All URIs are relative to *https://events.api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**htmlGet**](#htmlget) | **GET** /html | HTML page with upcoming events|
|[**upcomingEventsGet**](#upcomingeventsget) | **GET** /upcoming-events | Upcoming events HTML page|

# **htmlGet**
> string htmlGet()

Returns a formatted HTML page displaying upcoming events

### Example

```typescript
import {
    PagesApi,
    Configuration
} from '@tampa-devs/events-api-client';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

let groups: string; // (optional) (default to undefined)
let noonline: string; // (optional) (default to undefined)
let withinHours: string; // (optional) (default to undefined)
let withinDays: string; // (optional) (default to undefined)
let noempty: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.htmlGet(
    groups,
    noonline,
    withinHours,
    withinDays,
    noempty
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **groups** | [**string**] |  | (optional) defaults to undefined|
| **noonline** | [**string**] |  | (optional) defaults to undefined|
| **withinHours** | [**string**] |  | (optional) defaults to undefined|
| **withinDays** | [**string**] |  | (optional) defaults to undefined|
| **noempty** | [**string**] |  | (optional) defaults to undefined|


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
|**200** | HTML page |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **upcomingEventsGet**
> string upcomingEventsGet()

Alias for /html - returns a formatted HTML page displaying upcoming events

### Example

```typescript
import {
    PagesApi,
    Configuration
} from '@tampa-devs/events-api-client';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

let groups: string; // (optional) (default to undefined)
let noonline: string; // (optional) (default to undefined)
let withinHours: string; // (optional) (default to undefined)
let withinDays: string; // (optional) (default to undefined)
let noempty: string; // (optional) (default to undefined)

const { status, data } = await apiInstance.upcomingEventsGet(
    groups,
    noonline,
    withinHours,
    withinDays,
    noempty
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **groups** | [**string**] |  | (optional) defaults to undefined|
| **noonline** | [**string**] |  | (optional) defaults to undefined|
| **withinHours** | [**string**] |  | (optional) defaults to undefined|
| **withinDays** | [**string**] |  | (optional) defaults to undefined|
| **noempty** | [**string**] |  | (optional) defaults to undefined|


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
|**200** | HTML page |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

