# GroupsApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**_20260125groupsGet**](#_20260125groupsget) | **GET** /2026-01-25/groups | Get all public groups|
|[**_20260125groupsSlugGet**](#_20260125groupsslugget) | **GET** /2026-01-25/groups/{slug} | Get a group by slug|
|[**v1FavoritesGet**](#v1favoritesget) | **GET** /v1/favorites | List favorite groups|
|[**v1FavoritesGroupSlugDelete**](#v1favoritesgroupslugdelete) | **DELETE** /v1/favorites/{groupSlug} | Remove group from favorites|
|[**v1FavoritesGroupSlugPost**](#v1favoritesgroupslugpost) | **POST** /v1/favorites/{groupSlug} | Add group to favorites|
|[**v1GroupsGet**](#v1groupsget) | **GET** /v1/groups | List groups|
|[**v1GroupsSlugGet**](#v1groupsslugget) | **GET** /v1/groups/{slug} | Get group details|

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

[BearerToken](../README.md#BearerToken)

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

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Group details |  -  |
|**404** | Group not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1FavoritesGet**
> VV1FavoritesGet200Response v1FavoritesGet()

Returns the groups the authenticated user has favorited.

### Example

```typescript
import {
    GroupsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new GroupsApi(configuration);

const { status, data } = await apiInstance.v1FavoritesGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**VV1FavoritesGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Favorite groups |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1FavoritesGroupSlugDelete**
> v1FavoritesGroupSlugDelete()

Removes a group from the authenticated user\'s favorites.

### Example

```typescript
import {
    GroupsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new GroupsApi(configuration);

let groupSlug: string; // (default to undefined)

const { status, data } = await apiInstance.v1FavoritesGroupSlugDelete(
    groupSlug
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **groupSlug** | [**string**] |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Favorite removed |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1FavoritesGroupSlugPost**
> VV1FavoritesGroupSlugPost200Response v1FavoritesGroupSlugPost()

Adds a group to the authenticated user\'s favorites. Returns 200 if already favorited.

### Example

```typescript
import {
    GroupsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new GroupsApi(configuration);

let groupSlug: string; // (default to undefined)

const { status, data } = await apiInstance.v1FavoritesGroupSlugPost(
    groupSlug
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **groupSlug** | [**string**] |  | defaults to undefined|


### Return type

**VV1FavoritesGroupSlugPost200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Already favorited |  -  |
|**201** | Group added to favorites |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1GroupsGet**
> VV1GroupsGet200Response v1GroupsGet()

Returns a paginated list of groups displayed on the site, ordered by member count.

### Example

```typescript
import {
    GroupsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new GroupsApi(configuration);

let limit: number; // (optional) (default to 20)
let offset: number; // (optional) (default to 0)

const { status, data } = await apiInstance.v1GroupsGet(
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

**VV1GroupsGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Groups |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1GroupsSlugGet**
> VV1GroupsSlugGet200Response v1GroupsSlugGet()

Returns detailed information about a group including its upcoming events.

### Example

```typescript
import {
    GroupsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new GroupsApi(configuration);

let slug: string; // (default to undefined)

const { status, data } = await apiInstance.v1GroupsSlugGet(
    slug
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **slug** | [**string**] |  | defaults to undefined|


### Return type

**VV1GroupsSlugGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Group details with upcoming events |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

