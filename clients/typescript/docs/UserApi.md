# UserApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**v1MeGet**](#v1meget) | **GET** /v1/me | Get current user identity|
|[**v1MeLinkedAccountsGet**](#v1melinkedaccountsget) | **GET** /v1/me/linked-accounts | List linked OAuth accounts|
|[**v1ProfileAchievementsGet**](#v1profileachievementsget) | **GET** /v1/profile/achievements | Get achievement progress|
|[**v1ProfileGet**](#v1profileget) | **GET** /v1/profile | Get current user profile|
|[**v1ProfilePatch**](#v1profilepatch) | **PATCH** /v1/profile | Update current user profile|
|[**v1ProfilePortfolioGet**](#v1profileportfolioget) | **GET** /v1/profile/portfolio | List portfolio items|
|[**v1ProfilePortfolioIdDelete**](#v1profileportfolioiddelete) | **DELETE** /v1/profile/portfolio/{id} | Delete portfolio item|
|[**v1ProfilePortfolioIdPatch**](#v1profileportfolioidpatch) | **PATCH** /v1/profile/portfolio/{id} | Update portfolio item|
|[**v1ProfilePortfolioPost**](#v1profileportfoliopost) | **POST** /v1/profile/portfolio | Create portfolio item|
|[**v1ProfileTokensGet**](#v1profiletokensget) | **GET** /v1/profile/tokens | List personal access tokens|
|[**v1ProfileTokensIdDelete**](#v1profiletokensiddelete) | **DELETE** /v1/profile/tokens/{id} | Revoke personal access token|
|[**v1ProfileTokensPost**](#v1profiletokenspost) | **POST** /v1/profile/tokens | Create personal access token|

# **v1MeGet**
> VV1MeGet200Response v1MeGet()

Returns basic identity information for the authenticated user. Email is included only if the `user:email` scope is granted.

### Example

```typescript
import {
    UserApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

const { status, data } = await apiInstance.v1MeGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**VV1MeGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Current user identity |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1MeLinkedAccountsGet**
> VV1MeLinkedAccountsGet200Response v1MeLinkedAccountsGet()

Returns the OAuth providers (GitHub, Discord, etc.) connected to the authenticated user\'s account.

### Example

```typescript
import {
    UserApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

const { status, data } = await apiInstance.v1MeLinkedAccountsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**VV1MeLinkedAccountsGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Linked OAuth accounts |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ProfileAchievementsGet**
> VV1ProfileAchievementsGet200Response v1ProfileAchievementsGet()

Returns all achievements with the authenticated user\'s progress toward each.

### Example

```typescript
import {
    UserApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

const { status, data } = await apiInstance.v1ProfileAchievementsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**VV1ProfileAchievementsGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Achievement progress |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ProfileGet**
> VV1ProfileGet200Response v1ProfileGet()

Returns the full profile for the authenticated user including bio, social links, and settings.

### Example

```typescript
import {
    UserApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

const { status, data } = await apiInstance.v1ProfileGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**VV1ProfileGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Full user profile |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ProfilePatch**
> VV1ProfileGet200Response v1ProfilePatch()

Updates the authenticated user\'s profile fields. Only provided fields are updated.

### Example

```typescript
import {
    UserApi,
    Configuration,
    VUpdateProfileRequest
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

let vUpdateProfileRequest: VUpdateProfileRequest; // (optional)

const { status, data } = await apiInstance.v1ProfilePatch(
    vUpdateProfileRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **vUpdateProfileRequest** | **VUpdateProfileRequest**|  | |


### Return type

**VV1ProfileGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated user profile |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**409** | Conflict — duplicate or state conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ProfilePortfolioGet**
> VV1ProfilePortfolioGet200Response v1ProfilePortfolioGet()

Returns all portfolio items for the authenticated user, ordered by sort order.

### Example

```typescript
import {
    UserApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

const { status, data } = await apiInstance.v1ProfilePortfolioGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**VV1ProfilePortfolioGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Portfolio items |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ProfilePortfolioIdDelete**
> v1ProfilePortfolioIdDelete()

Permanently removes a portfolio item from the authenticated user\'s profile.

### Example

```typescript
import {
    UserApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.v1ProfilePortfolioIdDelete(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


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
|**204** | Portfolio item deleted |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ProfilePortfolioIdPatch**
> VV1ProfilePortfolioPost201Response v1ProfilePortfolioIdPatch()

Updates an existing portfolio item. Only provided fields are changed.

### Example

```typescript
import {
    UserApi,
    Configuration,
    VPortfolioItemUpdateRequest
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

let id: string; // (default to undefined)
let vPortfolioItemUpdateRequest: VPortfolioItemUpdateRequest; // (optional)

const { status, data } = await apiInstance.v1ProfilePortfolioIdPatch(
    id,
    vPortfolioItemUpdateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **vPortfolioItemUpdateRequest** | **VPortfolioItemUpdateRequest**|  | |
| **id** | [**string**] |  | defaults to undefined|


### Return type

**VV1ProfilePortfolioPost201Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated portfolio item |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ProfilePortfolioPost**
> VV1ProfilePortfolioPost201Response v1ProfilePortfolioPost()

Adds a new portfolio item to the authenticated user\'s profile.

### Example

```typescript
import {
    UserApi,
    Configuration,
    VPortfolioItemRequest
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

let vPortfolioItemRequest: VPortfolioItemRequest; // (optional)

const { status, data } = await apiInstance.v1ProfilePortfolioPost(
    vPortfolioItemRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **vPortfolioItemRequest** | **VPortfolioItemRequest**|  | |


### Return type

**VV1ProfilePortfolioPost201Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created portfolio item |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ProfileTokensGet**
> VV1ProfileTokensGet200Response v1ProfileTokensGet()

Returns all personal access tokens for the authenticated user. Token values are not included.

### Example

```typescript
import {
    UserApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

const { status, data } = await apiInstance.v1ProfileTokensGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**VV1ProfileTokensGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Personal access tokens |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ProfileTokensIdDelete**
> v1ProfileTokensIdDelete()

Permanently revokes a personal access token. The token can no longer be used for authentication.

### Example

```typescript
import {
    UserApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.v1ProfileTokensIdDelete(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


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
|**204** | Token revoked |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ProfileTokensPost**
> VV1ProfileTokensPost201Response v1ProfileTokensPost()

Creates a new personal access token. The full token value is returned only once in the response -- store it securely.

### Example

```typescript
import {
    UserApi,
    Configuration,
    VCreateTokenRequest
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new UserApi(configuration);

let vCreateTokenRequest: VCreateTokenRequest; // (optional)

const { status, data } = await apiInstance.v1ProfileTokensPost(
    vCreateTokenRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **vCreateTokenRequest** | **VCreateTokenRequest**|  | |


### Return type

**VV1ProfileTokensPost201Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created token with full value |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

