# EventsApi

All URIs are relative to *https://events.api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**_20260125eventsGet**](#_20260125eventsget) | **GET** /2026-01-25/events | Get all events|
|[**_20260125eventsNextGet**](#_20260125eventsnextget) | **GET** /2026-01-25/events/next | Get next event per group|

# **_20260125eventsGet**
> Array<V20260125EventsGet200ResponseInner> _20260125eventsGet()

Returns a list of all upcoming events, optionally filtered by query parameters

### Example

```typescript
import {
    EventsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new EventsApi(configuration);

let groups: string; // (optional) (default to undefined)
let noonline: string; // (optional) (default to undefined)
let withinHours: string; // (optional) (default to undefined)
let withinDays: string; // (optional) (default to undefined)
let noempty: string; // (optional) (default to undefined)

const { status, data } = await apiInstance._20260125eventsGet(
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

**Array<V20260125EventsGet200ResponseInner>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/plain


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of events |  -  |
|**503** | Service unavailable - no event data |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **_20260125eventsNextGet**
> Array<V20260125EventsGet200ResponseInner> _20260125eventsNextGet()

Returns one upcoming event for each group (the next event)

### Example

```typescript
import {
    EventsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new EventsApi(configuration);

let groups: string; // (optional) (default to undefined)
let noonline: string; // (optional) (default to undefined)
let withinHours: string; // (optional) (default to undefined)
let withinDays: string; // (optional) (default to undefined)
let noempty: string; // (optional) (default to undefined)

const { status, data } = await apiInstance._20260125eventsNextGet(
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

**Array<V20260125EventsGet200ResponseInner>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/plain


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Next event for each group |  -  |
|**503** | Service unavailable - no event data |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

