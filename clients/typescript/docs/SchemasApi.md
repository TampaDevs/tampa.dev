# SchemasApi

All URIs are relative to *https://api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**_20260125schemasGet**](#_20260125schemasget) | **GET** /2026-01-25/schemas | List all JSON schemas|
|[**_20260125schemasNameGet**](#_20260125schemasnameget) | **GET** /2026-01-25/schemas/{name} | Get specific JSON schema|

# **_20260125schemasGet**
> V20260125SchemasGet200Response _20260125schemasGet()

Returns metadata about all available JSON schemas for the API models

### Example

```typescript
import {
    SchemasApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new SchemasApi(configuration);

const { status, data } = await apiInstance._20260125schemasGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**V20260125SchemasGet200Response**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of available schemas |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **_20260125schemasNameGet**
> any _20260125schemasNameGet()

Returns the JSON Schema for a specific model type

### Example

```typescript
import {
    SchemasApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new SchemasApi(configuration);

let name: string; // (default to undefined)

const { status, data } = await apiInstance._20260125schemasNameGet(
    name
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **name** | [**string**] |  | defaults to undefined|


### Return type

**any**

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/schema+json, application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | JSON Schema |  -  |
|**404** | Schema not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

