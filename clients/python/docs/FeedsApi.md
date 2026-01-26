# tampa_events_api.FeedsApi

All URIs are relative to *https://events.api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**call_20260125_feed_get**](FeedsApi.md#call_20260125_feed_get) | **GET** /2026-01-25/feed | Get RSS feed (alias)
[**call_20260125_ical_get**](FeedsApi.md#call_20260125_ical_get) | **GET** /2026-01-25/ical | Get iCalendar feed (alias)
[**call_20260125_ics_get**](FeedsApi.md#call_20260125_ics_get) | **GET** /2026-01-25/ics | Get iCalendar feed
[**call_20260125_rss_get**](FeedsApi.md#call_20260125_rss_get) | **GET** /2026-01-25/rss | Get RSS feed
[**call_20260125_webcal_get**](FeedsApi.md#call_20260125_webcal_get) | **GET** /2026-01-25/webcal | Get webcal feed


# **call_20260125_feed_get**
> str call_20260125_feed_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

Get RSS feed (alias)

Alias for /rss - returns events as an RSS 2.0 feed

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
    api_instance = tampa_events_api.FeedsApi(api_client)
    groups = 'tampa-devs,suncoast-js' # str |  (optional)
    noonline = '1' # str |  (optional)
    within_hours = '24' # str |  (optional)
    within_days = '7' # str |  (optional)
    noempty = '1' # str |  (optional)

    try:
        # Get RSS feed (alias)
        api_response = api_instance.call_20260125_feed_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)
        print("The response of FeedsApi->call_20260125_feed_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FeedsApi->call_20260125_feed_get: %s\n" % e)
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
 - **Accept**: application/rss+xml

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | RSS feed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **call_20260125_ical_get**
> str call_20260125_ical_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

Get iCalendar feed (alias)

Alias for /ics - returns events as an iCalendar (.ics) feed

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
    api_instance = tampa_events_api.FeedsApi(api_client)
    groups = 'tampa-devs,suncoast-js' # str |  (optional)
    noonline = '1' # str |  (optional)
    within_hours = '24' # str |  (optional)
    within_days = '7' # str |  (optional)
    noempty = '1' # str |  (optional)

    try:
        # Get iCalendar feed (alias)
        api_response = api_instance.call_20260125_ical_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)
        print("The response of FeedsApi->call_20260125_ical_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FeedsApi->call_20260125_ical_get: %s\n" % e)
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
 - **Accept**: text/calendar

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | iCalendar feed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **call_20260125_ics_get**
> str call_20260125_ics_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

Get iCalendar feed

Returns events as an iCalendar (.ics) feed

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
    api_instance = tampa_events_api.FeedsApi(api_client)
    groups = 'tampa-devs,suncoast-js' # str |  (optional)
    noonline = '1' # str |  (optional)
    within_hours = '24' # str |  (optional)
    within_days = '7' # str |  (optional)
    noempty = '1' # str |  (optional)

    try:
        # Get iCalendar feed
        api_response = api_instance.call_20260125_ics_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)
        print("The response of FeedsApi->call_20260125_ics_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FeedsApi->call_20260125_ics_get: %s\n" % e)
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
 - **Accept**: text/calendar

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | iCalendar feed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **call_20260125_rss_get**
> str call_20260125_rss_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

Get RSS feed

Returns events as an RSS 2.0 feed

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
    api_instance = tampa_events_api.FeedsApi(api_client)
    groups = 'tampa-devs,suncoast-js' # str |  (optional)
    noonline = '1' # str |  (optional)
    within_hours = '24' # str |  (optional)
    within_days = '7' # str |  (optional)
    noempty = '1' # str |  (optional)

    try:
        # Get RSS feed
        api_response = api_instance.call_20260125_rss_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)
        print("The response of FeedsApi->call_20260125_rss_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FeedsApi->call_20260125_rss_get: %s\n" % e)
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
 - **Accept**: application/rss+xml

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | RSS feed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **call_20260125_webcal_get**
> str call_20260125_webcal_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

Get webcal feed

Returns events as an iCalendar feed (same as /ics, for webcal:// protocol)

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
    api_instance = tampa_events_api.FeedsApi(api_client)
    groups = 'tampa-devs,suncoast-js' # str |  (optional)
    noonline = '1' # str |  (optional)
    within_hours = '24' # str |  (optional)
    within_days = '7' # str |  (optional)
    noempty = '1' # str |  (optional)

    try:
        # Get webcal feed
        api_response = api_instance.call_20260125_webcal_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)
        print("The response of FeedsApi->call_20260125_webcal_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FeedsApi->call_20260125_webcal_get: %s\n" % e)
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
 - **Accept**: text/calendar

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | iCalendar feed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

