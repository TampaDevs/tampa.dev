# GroupsApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**_20260125groupsGet**](#_20260125groupsget) | **GET** /2026-01-25/groups | Get all public groups|
|[**_20260125groupsSlugGet**](#_20260125groupsslugget) | **GET** /2026-01-25/groups/{slug} | Get a group by slug|

# **_20260125groupsGet**
> Array<V20260125GroupsGet200ResponseInner> _20260125groupsGet()

Returns a list of all groups displayed on the website

### Example

```typescript
import {
    GroupsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new GroupsApi(configuration);

let featured: string; // (optional) (default to undefined)
let tag: string; // (optional) (default to undefined)

const { status, data } = await apiInstance._20260125groupsGet(
    featured,
    tag
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **featured** | [**string**] |  | (optional) defaults to undefined|
| **tag** | [**string**] |  | (optional) defaults to undefined|


### Return type

**Array<V20260125GroupsGet200ResponseInner>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of groups |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **_20260125groupsSlugGet**
> V20260125GroupsGet200ResponseInner _20260125groupsSlugGet()

Returns a single group by its URL slug

### Example

```typescript
import {
    GroupsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new GroupsApi(configuration);

let slug: string; // (default to undefined)

const { status, data } = await apiInstance._20260125groupsSlugGet(
    slug
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **slug** | [**string**] |  | defaults to undefined|


### Return type

**V20260125GroupsGet200ResponseInner**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Group details |  -  |
|**404** | Group not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

