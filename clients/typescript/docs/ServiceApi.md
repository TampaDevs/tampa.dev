# ServiceApi

All URIs are relative to *https://events.api.tampa.dev*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**serviceStatusGet**](#servicestatusget) | **GET** /service/status | Service status|

# **serviceStatusGet**
> VServiceStatusGet200Response serviceStatusGet()

Returns service status and configuration information, including platforms, groups, and aggregation diagnostics.

### Example

```typescript
import {
    ServiceApi,
    Configuration
} from '@tampadevs/events-api-client';

const configuration = new Configuration();
const apiInstance = new ServiceApi(configuration);

const { status, data } = await apiInstance.serviceStatusGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**VServiceStatusGet200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Service status |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

