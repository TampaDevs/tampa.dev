# tampa_events_api.WidgetsApi

All URIs are relative to *https://events.api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**widget_carousel_get**](WidgetsApi.md#widget_carousel_get) | **GET** /widget/carousel | Carousel HTML widget
[**widget_next_event_get**](WidgetsApi.md#widget_next_event_get) | **GET** /widget/next-event | Next event HTML widget


# **widget_carousel_get**
> str widget_carousel_get(groups=groups)

Carousel HTML widget

Returns an HTML carousel widget showing upcoming events

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
    api_instance = tampa_events_api.WidgetsApi(api_client)
    groups = 'tampadevs,suncoast-js' # str |  (optional)

    try:
        # Carousel HTML widget
        api_response = api_instance.widget_carousel_get(groups=groups)
        print("The response of WidgetsApi->widget_carousel_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WidgetsApi->widget_carousel_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groups** | **str**|  | [optional] 

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
**200** | HTML carousel widget |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **widget_next_event_get**
> str widget_next_event_get(groups=groups)

Next event HTML widget

Returns an HTML widget showing the next upcoming event

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
    api_instance = tampa_events_api.WidgetsApi(api_client)
    groups = 'tampadevs,suncoast-js' # str |  (optional)

    try:
        # Next event HTML widget
        api_response = api_instance.widget_next_event_get(groups=groups)
        print("The response of WidgetsApi->widget_next_event_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling WidgetsApi->widget_next_event_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **groups** | **str**|  | [optional] 

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
**200** | HTML widget |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

