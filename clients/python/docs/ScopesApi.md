# tampa_events_api.ScopesApi

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**v1_scopes_get**](ScopesApi.md#v1_scopes_get) | **GET** /v1/scopes | List OAuth scopes


# **v1_scopes_get**
> VV1ScopesGet200Response v1_scopes_get()

List OAuth scopes

Returns all available OAuth scopes with descriptions and hierarchy. No authentication required.

### Example


```python
import tampa_events_api
from tampa_events_api.models.vv1_scopes_get200_response import VV1ScopesGet200Response
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)


# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.ScopesApi(api_client)

    try:
        # List OAuth scopes
        api_response = api_instance.v1_scopes_get()
        print("The response of ScopesApi->v1_scopes_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ScopesApi->v1_scopes_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1ScopesGet200Response**](VV1ScopesGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Available OAuth scopes |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

