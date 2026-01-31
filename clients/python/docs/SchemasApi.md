# tampa_events_api.SchemasApi

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**call_20260125_schemas_get**](SchemasApi.md#call_20260125_schemas_get) | **GET** /2026-01-25/schemas | List all JSON schemas
[**call_20260125_schemas_name_get**](SchemasApi.md#call_20260125_schemas_name_get) | **GET** /2026-01-25/schemas/{name} | Get specific JSON schema


# **call_20260125_schemas_get**
> V20260125SchemasGet200Response call_20260125_schemas_get()

List all JSON schemas

Returns metadata about all available JSON schemas for the API models

### Example


```python
import tampa_events_api
from tampa_events_api.models.v20260125_schemas_get200_response import V20260125SchemasGet200Response
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
    api_instance = tampa_events_api.SchemasApi(api_client)

    try:
        # List all JSON schemas
        api_response = api_instance.call_20260125_schemas_get()
        print("The response of SchemasApi->call_20260125_schemas_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SchemasApi->call_20260125_schemas_get: %s\n" % e)
```



### Parameters

This endpoint does not need any parameter.

### Return type

[**V20260125SchemasGet200Response**](V20260125SchemasGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of available schemas |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **call_20260125_schemas_name_get**
> object call_20260125_schemas_name_get(name)

Get specific JSON schema

Returns the JSON Schema for a specific model type

### Example


```python
import tampa_events_api
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
    api_instance = tampa_events_api.SchemasApi(api_client)
    name = 'event' # str | 

    try:
        # Get specific JSON schema
        api_response = api_instance.call_20260125_schemas_name_get(name)
        print("The response of SchemasApi->call_20260125_schemas_name_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling SchemasApi->call_20260125_schemas_name_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **name** | **str**|  | 

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/schema+json, application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | JSON Schema |  -  |
**404** | Schema not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

