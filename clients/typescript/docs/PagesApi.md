# PagesApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**htmlGet**](#htmlget) | **GET** /html | Deprecated — redirects to calendar|
|[**upcomingEventsGet**](#upcomingeventsget) | **GET** /upcoming-events | Deprecated — redirects to calendar|

# **htmlGet**
> htmlGet()

Formerly returned an HTML page with upcoming events. Now redirects to the calendar.

### Example

```typescript
import {
    PagesApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

const { status, data } = await apiInstance.htmlGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**301** | Permanent redirect to calendar |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **upcomingEventsGet**
> upcomingEventsGet()

Formerly returned an HTML page with upcoming events. Now redirects to the calendar.

### Example

```typescript
import {
    PagesApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new PagesApi(configuration);

const { status, data } = await apiInstance.upcomingEventsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**301** | Permanent redirect to calendar |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

