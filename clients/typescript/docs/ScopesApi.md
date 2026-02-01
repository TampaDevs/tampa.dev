# ScopesApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**v1ScopesGet**](#v1scopesget) | **GET** /v1/scopes | List OAuth scopes|

# **v1ScopesGet**
> VV1ScopesGet200Response v1ScopesGet()

Returns all available OAuth scopes with descriptions and hierarchy. No authentication required.

### Example

```typescript
import {
    ScopesApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new ScopesApi(configuration);

const { status, data } = await apiInstance.v1ScopesGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**VV1ScopesGet200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Available OAuth scopes |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

