# tampa_events_api.GroupsApi

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**call_20260125_groups_get**](GroupsApi.md#call_20260125_groups_get) | **GET** /2026-01-25/groups | Get all public groups
[**call_20260125_groups_slug_get**](GroupsApi.md#call_20260125_groups_slug_get) | **GET** /2026-01-25/groups/{slug} | Get a group by slug


# **call_20260125_groups_get**
> List[V20260125GroupsGet200ResponseInner] call_20260125_groups_get(featured=featured, tag=tag)

Get all public groups

Returns a list of all groups displayed on the website

### Example


```python
import tampa_events_api
from tampa_events_api.models.v20260125_groups_get200_response_inner import V20260125GroupsGet200ResponseInner
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
    api_instance = tampa_events_api.GroupsApi(api_client)
    featured = '1' # str |  (optional)
    tag = 'cloud' # str |  (optional)

    try:
        # Get all public groups
        api_response = api_instance.call_20260125_groups_get(featured=featured, tag=tag)
        print("The response of GroupsApi->call_20260125_groups_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling GroupsApi->call_20260125_groups_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **featured** | **str**|  | [optional] 
 **tag** | **str**|  | [optional] 

### Return type

[**List[V20260125GroupsGet200ResponseInner]**](V20260125GroupsGet200ResponseInner.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of groups |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **call_20260125_groups_slug_get**
> V20260125GroupsGet200ResponseInner call_20260125_groups_slug_get(slug)

Get a group by slug

Returns a single group by its URL slug

### Example


```python
import tampa_events_api
from tampa_events_api.models.v20260125_groups_get200_response_inner import V20260125GroupsGet200ResponseInner
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
    api_instance = tampa_events_api.GroupsApi(api_client)
    slug = 'tampadevs' # str | 

    try:
        # Get a group by slug
        api_response = api_instance.call_20260125_groups_slug_get(slug)
        print("The response of GroupsApi->call_20260125_groups_slug_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling GroupsApi->call_20260125_groups_slug_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **slug** | **str**|  | 

### Return type

[**V20260125GroupsGet200ResponseInner**](V20260125GroupsGet200ResponseInner.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Group details |  -  |
**404** | Group not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

