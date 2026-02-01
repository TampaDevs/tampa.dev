# tampa_events_api.EventsApi

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**call_20260125_events_get**](EventsApi.md#call_20260125_events_get) | **GET** /2026-01-25/events | Get all events
[**call_20260125_events_next_get**](EventsApi.md#call_20260125_events_next_get) | **GET** /2026-01-25/events/next | Get next event per group
[**v1_checkin_code_post**](EventsApi.md#v1_checkin_code_post) | **POST** /v1/checkin/{code} | Check in to event
[**v1_events_event_id_rsvp_delete**](EventsApi.md#v1_events_event_id_rsvp_delete) | **DELETE** /v1/events/{eventId}/rsvp | Cancel RSVP
[**v1_events_event_id_rsvp_get**](EventsApi.md#v1_events_event_id_rsvp_get) | **GET** /v1/events/{eventId}/rsvp | Get RSVP status
[**v1_events_event_id_rsvp_post**](EventsApi.md#v1_events_event_id_rsvp_post) | **POST** /v1/events/{eventId}/rsvp | RSVP to event
[**v1_events_event_id_rsvp_summary_get**](EventsApi.md#v1_events_event_id_rsvp_summary_get) | **GET** /v1/events/{eventId}/rsvp-summary | Get RSVP summary
[**v1_events_get**](EventsApi.md#v1_events_get) | **GET** /v1/events | List upcoming events


# **call_20260125_events_get**
> List[V20260125EventsGet200ResponseInner] call_20260125_events_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

Get all events

Returns a list of all upcoming events, optionally filtered by query parameters

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.v20260125_events_get200_response_inner import V20260125EventsGet200ResponseInner
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
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

[**List[V20260125EventsGet200ResponseInner]**](V20260125EventsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

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
> List[V20260125EventsGet200ResponseInner] call_20260125_events_next_get(groups=groups, noonline=noonline, within_hours=within_hours, within_days=within_days, noempty=noempty)

Get next event per group

Returns one upcoming event for each group (the next event)

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.v20260125_events_get200_response_inner import V20260125EventsGet200ResponseInner
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
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

[**List[V20260125EventsGet200ResponseInner]**](V20260125EventsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json, text/plain

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Next event for each group |  -  |
**503** | Service unavailable - no event data |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_checkin_code_post**
> VV1CheckinCodePost201Response v1_checkin_code_post(code)

Check in to event

Self check-in using a check-in code. Optionally specify the check-in method (link, qr, nfc).

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_checkin_code_post201_response import VV1CheckinCodePost201Response
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.EventsApi(api_client)
    code = 'code_example' # str | 

    try:
        # Check in to event
        api_response = api_instance.v1_checkin_code_post(code)
        print("The response of EventsApi->v1_checkin_code_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EventsApi->v1_checkin_code_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **code** | **str**|  | 

### Return type

[**VV1CheckinCodePost201Response**](VV1CheckinCodePost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Check-in recorded |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |
**409** | Conflict — duplicate or state conflict |  -  |
**410** | Gone — resource expired or exhausted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_events_event_id_rsvp_delete**
> VV1EventsEventIdRsvpDelete200Response v1_events_event_id_rsvp_delete(event_id)

Cancel RSVP

Cancels the authenticated user's RSVP. If a waitlisted user exists, they are automatically promoted.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_events_event_id_rsvp_delete200_response import VV1EventsEventIdRsvpDelete200Response
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.EventsApi(api_client)
    event_id = 'event_id_example' # str | 

    try:
        # Cancel RSVP
        api_response = api_instance.v1_events_event_id_rsvp_delete(event_id)
        print("The response of EventsApi->v1_events_event_id_rsvp_delete:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EventsApi->v1_events_event_id_rsvp_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **event_id** | **str**|  | 

### Return type

[**VV1EventsEventIdRsvpDelete200Response**](VV1EventsEventIdRsvpDelete200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | RSVP cancelled |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_events_event_id_rsvp_get**
> VV1EventsEventIdRsvpGet200Response v1_events_event_id_rsvp_get(event_id)

Get RSVP status

Returns the authenticated user's RSVP status for the specified event.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_events_event_id_rsvp_get200_response import VV1EventsEventIdRsvpGet200Response
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.EventsApi(api_client)
    event_id = 'event_id_example' # str | 

    try:
        # Get RSVP status
        api_response = api_instance.v1_events_event_id_rsvp_get(event_id)
        print("The response of EventsApi->v1_events_event_id_rsvp_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EventsApi->v1_events_event_id_rsvp_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **event_id** | **str**|  | 

### Return type

[**VV1EventsEventIdRsvpGet200Response**](VV1EventsEventIdRsvpGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | RSVP status (null if not RSVPed) |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_events_event_id_rsvp_post**
> VV1EventsEventIdRsvpPost201Response v1_events_event_id_rsvp_post(event_id)

RSVP to event

Creates an RSVP for the authenticated user. If the event is at capacity, the user is placed on the waitlist.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_events_event_id_rsvp_post201_response import VV1EventsEventIdRsvpPost201Response
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.EventsApi(api_client)
    event_id = 'event_id_example' # str | 

    try:
        # RSVP to event
        api_response = api_instance.v1_events_event_id_rsvp_post(event_id)
        print("The response of EventsApi->v1_events_event_id_rsvp_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EventsApi->v1_events_event_id_rsvp_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **event_id** | **str**|  | 

### Return type

[**VV1EventsEventIdRsvpPost201Response**](VV1EventsEventIdRsvpPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | RSVP created |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |
**409** | Conflict — duplicate or state conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_events_event_id_rsvp_summary_get**
> VV1EventsEventIdRsvpSummaryGet200Response v1_events_event_id_rsvp_summary_get(event_id)

Get RSVP summary

Returns aggregate RSVP counts (confirmed, waitlisted, cancelled) for the specified event.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_events_event_id_rsvp_summary_get200_response import VV1EventsEventIdRsvpSummaryGet200Response
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.EventsApi(api_client)
    event_id = 'event_id_example' # str | 

    try:
        # Get RSVP summary
        api_response = api_instance.v1_events_event_id_rsvp_summary_get(event_id)
        print("The response of EventsApi->v1_events_event_id_rsvp_summary_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EventsApi->v1_events_event_id_rsvp_summary_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **event_id** | **str**|  | 

### Return type

[**VV1EventsEventIdRsvpSummaryGet200Response**](VV1EventsEventIdRsvpSummaryGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | RSVP summary counts |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_events_get**
> VV1EventsGet200Response v1_events_get(limit=limit, offset=offset)

List upcoming events

Returns a paginated list of upcoming events across all groups, ordered by start time.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_events_get200_response import VV1EventsGet200Response
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)

# The client must configure the authentication and authorization parameters
# in accordance with the API server security policy.
# Examples for each auth method are provided below, use the example that
# satisfies your auth use case.

# Configure Bearer authorization: BearerToken
configuration = tampa_events_api.Configuration(
    access_token = os.environ["BEARER_TOKEN"]
)

# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.EventsApi(api_client)
    limit = 20 # float |  (optional) (default to 20)
    offset = 0 # float |  (optional) (default to 0)

    try:
        # List upcoming events
        api_response = api_instance.v1_events_get(limit=limit, offset=offset)
        print("The response of EventsApi->v1_events_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling EventsApi->v1_events_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **float**|  | [optional] [default to 20]
 **offset** | **float**|  | [optional] [default to 0]

### Return type

[**VV1EventsGet200Response**](VV1EventsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Upcoming events |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

