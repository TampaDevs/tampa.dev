# EventsApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**_20260125eventsGet**](#_20260125eventsget) | **GET** /2026-01-25/events | Get all events|
|[**_20260125eventsNextGet**](#_20260125eventsnextget) | **GET** /2026-01-25/events/next | Get next event per group|
|[**v1CheckinCodePost**](#v1checkincodepost) | **POST** /v1/checkin/{code} | Check in to event|
|[**v1EventsEventIdRsvpDelete**](#v1eventseventidrsvpdelete) | **DELETE** /v1/events/{eventId}/rsvp | Cancel RSVP|
|[**v1EventsEventIdRsvpGet**](#v1eventseventidrsvpget) | **GET** /v1/events/{eventId}/rsvp | Get RSVP status|
|[**v1EventsEventIdRsvpPost**](#v1eventseventidrsvppost) | **POST** /v1/events/{eventId}/rsvp | RSVP to event|
|[**v1EventsEventIdRsvpSummaryGet**](#v1eventseventidrsvpsummaryget) | **GET** /v1/events/{eventId}/rsvp-summary | Get RSVP summary|
|[**v1EventsGet**](#v1eventsget) | **GET** /v1/events | List upcoming events|

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

[BearerToken](../README.md#BearerToken)

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

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/plain


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Next event for each group |  -  |
|**503** | Service unavailable - no event data |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1CheckinCodePost**
> VV1CheckinCodePost201Response v1CheckinCodePost()

Self check-in using a check-in code. Optionally specify the check-in method (link, qr, nfc).

### Example

```typescript
import {
    EventsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new EventsApi(configuration);

let code: string; // (default to undefined)

const { status, data } = await apiInstance.v1CheckinCodePost(
    code
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **code** | [**string**] |  | defaults to undefined|


### Return type

**VV1CheckinCodePost201Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Check-in recorded |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |
|**409** | Conflict — duplicate or state conflict |  -  |
|**410** | Gone — resource expired or exhausted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1EventsEventIdRsvpDelete**
> VV1EventsEventIdRsvpDelete200Response v1EventsEventIdRsvpDelete()

Cancels the authenticated user\'s RSVP. If a waitlisted user exists, they are automatically promoted.

### Example

```typescript
import {
    EventsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new EventsApi(configuration);

let eventId: string; // (default to undefined)

const { status, data } = await apiInstance.v1EventsEventIdRsvpDelete(
    eventId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eventId** | [**string**] |  | defaults to undefined|


### Return type

**VV1EventsEventIdRsvpDelete200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | RSVP cancelled |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1EventsEventIdRsvpGet**
> VV1EventsEventIdRsvpGet200Response v1EventsEventIdRsvpGet()

Returns the authenticated user\'s RSVP status for the specified event.

### Example

```typescript
import {
    EventsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new EventsApi(configuration);

let eventId: string; // (default to undefined)

const { status, data } = await apiInstance.v1EventsEventIdRsvpGet(
    eventId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eventId** | [**string**] |  | defaults to undefined|


### Return type

**VV1EventsEventIdRsvpGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | RSVP status (null if not RSVPed) |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1EventsEventIdRsvpPost**
> VV1EventsEventIdRsvpPost201Response v1EventsEventIdRsvpPost()

Creates an RSVP for the authenticated user. If the event is at capacity, the user is placed on the waitlist.

### Example

```typescript
import {
    EventsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new EventsApi(configuration);

let eventId: string; // (default to undefined)

const { status, data } = await apiInstance.v1EventsEventIdRsvpPost(
    eventId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eventId** | [**string**] |  | defaults to undefined|


### Return type

**VV1EventsEventIdRsvpPost201Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | RSVP created |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |
|**409** | Conflict — duplicate or state conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1EventsEventIdRsvpSummaryGet**
> VV1EventsEventIdRsvpSummaryGet200Response v1EventsEventIdRsvpSummaryGet()

Returns aggregate RSVP counts (confirmed, waitlisted, cancelled) for the specified event.

### Example

```typescript
import {
    EventsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new EventsApi(configuration);

let eventId: string; // (default to undefined)

const { status, data } = await apiInstance.v1EventsEventIdRsvpSummaryGet(
    eventId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **eventId** | [**string**] |  | defaults to undefined|


### Return type

**VV1EventsEventIdRsvpSummaryGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | RSVP summary counts |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1EventsGet**
> VV1EventsGet200Response v1EventsGet()

Returns a paginated list of upcoming events across all groups, ordered by start time.

### Example

```typescript
import {
    EventsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new EventsApi(configuration);

let limit: number; // (optional) (default to 20)
let offset: number; // (optional) (default to 0)

const { status, data } = await apiInstance.v1EventsGet(
    limit,
    offset
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] |  | (optional) defaults to 20|
| **offset** | [**number**] |  | (optional) defaults to 0|


### Return type

**VV1EventsGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Upcoming events |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

