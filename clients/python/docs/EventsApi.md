# tampa_events_api.EventsApi

All URIs are relative to *https://events.api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**call_20260125_events_get**](EventsApi.md#call_20260125_events_get) | **GET** /2026-01-25/events | Get all events
[**call_20260125_events_next_get**](EventsApi.md#call_20260125_events_next_get) | **GET** /2026-01-25/events/next | Get next event per group


# **call_20260125_events_get**
> List[Model20260125EventsGet200ResponseInner] call_20260125_events_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

Get all events

Returns a list of all upcoming events, optionally filtered by query parameters

### Example


```python
import tampa_events_api
from tampa_events_api.models.model20260125_events_get200_response_inner import Model20260125EventsGet200ResponseInner
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
    api_instance = tampa_events_api.EventsApi(api_client)
    groups = 'tampadevs,suncoast-js' # str |  (optional)
    noonline = '1' # str |  (optional)
    within_hours = '24' # str |  (optional)
    within_days = '7' # str |  (optional)
    noempty = '1' # str |  (optional)

    try:
        # Get all events
        api_response = api_instance.call_20260125_events_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)
        print("The response of EventsApi->call_20260125_events_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EventsApi->call_20260125_events_get: %s\n" % e)
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

[**List[Model20260125EventsGet200ResponseInner]**](Model20260125EventsGet200ResponseInner.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/plain

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of events |  -  |
**503** | Service unavailable - no event data |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **call_20260125_events_next_get**
> List[Model20260125EventsGet200ResponseInner] call_20260125_events_next_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

Get next event per group

Returns one upcoming event for each group (the next event)

### Example


```python
import tampa_events_api
from tampa_events_api.models.model20260125_events_get200_response_inner import Model20260125EventsGet200ResponseInner
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
    api_instance = tampa_events_api.EventsApi(api_client)
    groups = 'tampadevs,suncoast-js' # str |  (optional)
    noonline = '1' # str |  (optional)
    within_hours = '24' # str |  (optional)
    within_days = '7' # str |  (optional)
    noempty = '1' # str |  (optional)

    try:
        # Get next event per group
        api_response = api_instance.call_20260125_events_next_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)
        print("The response of EventsApi->call_20260125_events_next_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EventsApi->call_20260125_events_next_get: %s\n" % e)
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

[**List[Model20260125EventsGet200ResponseInner]**](Model20260125EventsGet200ResponseInner.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/plain

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Next event for each group |  -  |
**503** | Service unavailable - no event data |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

