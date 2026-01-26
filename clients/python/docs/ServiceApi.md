# tampa_events_api.ServiceApi

All URIs are relative to *https://events.api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**service_status_get**](ServiceApi.md#service_status_get) | **GET** /service/status | Service status


# **service_status_get**
> VServiceStatusGet200Response service_status_get()

Service status

Returns service status and configuration information, including platforms, groups, and aggregation diagnostics.

### Example


```python
import tampa_events_api
from tampa_events_api.models.v_service_status_get200_response import VServiceStatusGet200Response
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://events.api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://events.api.tampa.dev"
)


# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.ServiceApi(api_client)

    try:
        # Service status
        api_response = api_instance.service_status_get()
        print("The response of ServiceApi->service_status_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ServiceApi->service_status_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**VServiceStatusGet200Response**](VServiceStatusGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Service status |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

