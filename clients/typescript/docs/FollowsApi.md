# FollowsApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**v1UsersUsernameFollowDelete**](#v1usersusernamefollowdelete) | **DELETE** /v1/users/{username}/follow | Unfollow user|
|[**v1UsersUsernameFollowPost**](#v1usersusernamefollowpost) | **POST** /v1/users/{username}/follow | Follow user|
|[**v1UsersUsernameFollowersGet**](#v1usersusernamefollowersget) | **GET** /v1/users/{username}/followers | List followers|
|[**v1UsersUsernameFollowingGet**](#v1usersusernamefollowingget) | **GET** /v1/users/{username}/following | List following|

# **v1UsersUsernameFollowDelete**
> v1UsersUsernameFollowDelete()

Unfollows the specified user.

### Example

```typescript
import {
    FollowsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new FollowsApi(configuration);

let username: string; // (default to undefined)

const { status, data } = await apiInstance.v1UsersUsernameFollowDelete(
    username
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **username** | [**string**] |  | defaults to undefined|


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
|**204** | Unfollowed |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1UsersUsernameFollowPost**
> VV1UsersUsernameFollowPost200Response v1UsersUsernameFollowPost()

Follows the specified user. Returns 200 if already following.

### Example

```typescript
import {
    FollowsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new FollowsApi(configuration);

let username: string; // (default to undefined)

const { status, data } = await apiInstance.v1UsersUsernameFollowPost(
    username
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **username** | [**string**] |  | defaults to undefined|


### Return type

**VV1UsersUsernameFollowPost200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Already following |  -  |
|**201** | Now following user |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1UsersUsernameFollowersGet**
> VV1UsersUsernameFollowersGet200Response v1UsersUsernameFollowersGet()

Returns a paginated list of users following the specified user.

### Example

```typescript
import {
    FollowsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new FollowsApi(configuration);

let username: string; // (default to undefined)
let limit: number; // (optional) (default to 20)
let offset: number; // (optional) (default to 0)

const { status, data } = await apiInstance.v1UsersUsernameFollowersGet(
    username,
    limit,
    offset
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **username** | [**string**] |  | defaults to undefined|
| **limit** | [**number**] |  | (optional) defaults to 20|
| **offset** | [**number**] |  | (optional) defaults to 0|


### Return type

**VV1UsersUsernameFollowersGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Followers |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1UsersUsernameFollowingGet**
> VV1UsersUsernameFollowersGet200Response v1UsersUsernameFollowingGet()

Returns a paginated list of users the specified user is following.

### Example

```typescript
import {
    FollowsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new FollowsApi(configuration);

let username: string; // (default to undefined)
let limit: number; // (optional) (default to 20)
let offset: number; // (optional) (default to 0)

const { status, data } = await apiInstance.v1UsersUsernameFollowingGet(
    username,
    limit,
    offset
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **username** | [**string**] |  | defaults to undefined|
| **limit** | [**number**] |  | (optional) defaults to 20|
| **offset** | [**number**] |  | (optional) defaults to 0|


### Return type

**VV1UsersUsernameFollowersGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Following |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

