# ClaimsApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**v1ClaimCodeGet**](#v1claimcodeget) | **GET** /v1/claim/{code} | Get badge claim info|
|[**v1ClaimCodePost**](#v1claimcodepost) | **POST** /v1/claim/{code} | Claim a badge|

# **v1ClaimCodeGet**
> VV1ClaimCodeGet200Response v1ClaimCodeGet()

Returns information about a badge claim link. No authentication required.

### Example

```typescript
import {
    ClaimsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new ClaimsApi(configuration);

let code: string; // (default to undefined)

const { status, data } = await apiInstance.v1ClaimCodeGet(
    code
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **code** | [**string**] |  | defaults to undefined|


### Return type

**VV1ClaimCodeGet200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Claim link information |  -  |
|**404** | Not Found — resource does not exist |  -  |
|**410** | Gone — resource expired or exhausted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1ClaimCodePost**
> VV1ClaimCodePost201Response v1ClaimCodePost()

Claims a badge using a claim link code. Requires authentication.

### Example

```typescript
import {
    ClaimsApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new ClaimsApi(configuration);

let code: string; // (default to undefined)

const { status, data } = await apiInstance.v1ClaimCodePost(
    code
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **code** | [**string**] |  | defaults to undefined|


### Return type

**VV1ClaimCodePost201Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Badge claimed |  -  |
|**401** | Unauthorized — missing or invalid authentication |  -  |
|**403** | Forbidden — insufficient scope or permissions |  -  |
|**404** | Not Found — resource does not exist |  -  |
|**409** | Conflict — duplicate or state conflict |  -  |
|**410** | Gone — resource expired or exhausted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

