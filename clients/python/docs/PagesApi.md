# tampa_events_api.PagesApi

All URIs are relative to *https://events.api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**html_get**](PagesApi.md#html_get) | **GET** /html | HTML page with upcoming events
[**upcoming_events_get**](PagesApi.md#upcoming_events_get) | **GET** /upcoming-events | Upcoming events HTML page


# **html_get**
> str html_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

HTML page with upcoming events

Returns a formatted HTML page displaying upcoming events

### Example


```python
import tampa_events_api
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
    api_instance = tampa_events_api.PagesApi(api_client)
    groups = 'tampa-devs,suncoast-js' # str |  (optional)
    noonline = '1' # str |  (optional)
    within_hours = '24' # str |  (optional)
    within_days = '7' # str |  (optional)
    noempty = '1' # str |  (optional)

    try:
        # HTML page with upcoming events
        api_response = api_instance.html_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)
        print("The response of PagesApi->html_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PagesApi->html_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groups** | **str**|  | [optional] 
 **noonline** | **str**|  | [optional] 
 **within_hours** | **str**|  | [optional] 
 **within_days** | **str**|  | [optional] 
 **noempty** | **str**|  | [optional] 

### Return type

**str**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/html

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | HTML page |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **upcoming_events_get**
> str upcoming_events_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

Upcoming events HTML page

Alias for /html - returns a formatted HTML page displaying upcoming events

### Example


```python
import tampa_events_api
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
    api_instance = tampa_events_api.PagesApi(api_client)
    groups = 'tampa-devs,suncoast-js' # str |  (optional)
    noonline = '1' # str |  (optional)
    within_hours = '24' # str |  (optional)
    within_days = '7' # str |  (optional)
    noempty = '1' # str |  (optional)

    try:
        # Upcoming events HTML page
        api_response = api_instance.upcoming_events_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)
        print("The response of PagesApi->upcoming_events_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling PagesApi->upcoming_events_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groups** | **str**|  | [optional] 
 **noonline** | **str**|  | [optional] 
 **within_hours** | **str**|  | [optional] 
 **within_days** | **str**|  | [optional] 
 **noempty** | **str**|  | [optional] 

### Return type

**str**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: text/html

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | HTML page |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

