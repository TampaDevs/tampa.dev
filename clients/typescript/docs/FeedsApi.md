# FeedsApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**_20260125feedGet**](#_20260125feedget) | **GET** /2026-01-25/feed | Get RSS feed (alias)|
|[**_20260125icalGet**](#_20260125icalget) | **GET** /2026-01-25/ical | Get iCalendar feed (alias)|
|[**_20260125icsGet**](#_20260125icsget) | **GET** /2026-01-25/ics | Get iCalendar feed|
|[**_20260125rssGet**](#_20260125rssget) | **GET** /2026-01-25/rss | Get RSS feed|
|[**_20260125webcalGet**](#_20260125webcalget) | **GET** /2026-01-25/webcal | Get webcal feed|

# **_20260125feedGet**
> string _20260125feedGet()

Alias for /rss - returns events as an RSS 2.0 feed

### Example

```typescript
import {
    FeedsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new FeedsApi(configuration);

let groups: string; // (optional) (default to undefined)
let noonline: string; // (optional) (default to undefined)
let withinHours: string; // (optional) (default to undefined)
let withinDays: string; // (optional) (default to undefined)
let noempty: string; // (optional) (default to undefined)

const { status, data } = await apiInstance._20260125feedGet(
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

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/rss+xml


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | RSS feed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **_20260125icalGet**
> string _20260125icalGet()

Alias for /ics - returns events as an iCalendar (.ics) feed

### Example

```typescript
import {
    FeedsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new FeedsApi(configuration);

let groups: string; // (optional) (default to undefined)
let noonline: string; // (optional) (default to undefined)
let withinHours: string; // (optional) (default to undefined)
let withinDays: string; // (optional) (default to undefined)
let noempty: string; // (optional) (default to undefined)

const { status, data } = await apiInstance._20260125icalGet(
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

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/calendar


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | iCalendar feed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **_20260125icsGet**
> string _20260125icsGet()

Returns events as an iCalendar (.ics) feed

### Example

```typescript
import {
    FeedsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new FeedsApi(configuration);

let groups: string; // (optional) (default to undefined)
let noonline: string; // (optional) (default to undefined)
let withinHours: string; // (optional) (default to undefined)
let withinDays: string; // (optional) (default to undefined)
let noempty: string; // (optional) (default to undefined)

const { status, data } = await apiInstance._20260125icsGet(
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

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/calendar


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | iCalendar feed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **_20260125rssGet**
> string _20260125rssGet()

Returns events as an RSS 2.0 feed

### Example

```typescript
import {
    FeedsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new FeedsApi(configuration);

let groups: string; // (optional) (default to undefined)
let noonline: string; // (optional) (default to undefined)
let withinHours: string; // (optional) (default to undefined)
let withinDays: string; // (optional) (default to undefined)
let noempty: string; // (optional) (default to undefined)

const { status, data } = await apiInstance._20260125rssGet(
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

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/rss+xml


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | RSS feed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **_20260125webcalGet**
> string _20260125webcalGet()

Returns events as an iCalendar feed (same as /ics, for webcal:// protocol)

### Example

```typescript
import {
    FeedsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new FeedsApi(configuration);

let groups: string; // (optional) (default to undefined)
let noonline: string; // (optional) (default to undefined)
let withinHours: string; // (optional) (default to undefined)
let withinDays: string; // (optional) (default to undefined)
let noempty: string; // (optional) (default to undefined)

const { status, data } = await apiInstance._20260125webcalGet(
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

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/calendar


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | iCalendar feed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

