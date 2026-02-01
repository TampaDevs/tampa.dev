# TampaEventsAPI::EventsApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**call_20260125_events_get**](EventsApi.md#call_20260125_events_get) | **GET** /2026-01-25/events | Get all events |
| [**call_20260125_events_next_get**](EventsApi.md#call_20260125_events_next_get) | **GET** /2026-01-25/events/next | Get next event per group |
| [**v1_checkin_code_post**](EventsApi.md#v1_checkin_code_post) | **POST** /v1/checkin/{code} | Check in to event |
| [**v1_events_event_id_rsvp_delete**](EventsApi.md#v1_events_event_id_rsvp_delete) | **DELETE** /v1/events/{eventId}/rsvp | Cancel RSVP |
| [**v1_events_event_id_rsvp_get**](EventsApi.md#v1_events_event_id_rsvp_get) | **GET** /v1/events/{eventId}/rsvp | Get RSVP status |
| [**v1_events_event_id_rsvp_post**](EventsApi.md#v1_events_event_id_rsvp_post) | **POST** /v1/events/{eventId}/rsvp | RSVP to event |
| [**v1_events_event_id_rsvp_summary_get**](EventsApi.md#v1_events_event_id_rsvp_summary_get) | **GET** /v1/events/{eventId}/rsvp-summary | Get RSVP summary |
| [**v1_events_get**](EventsApi.md#v1_events_get) | **GET** /v1/events | List upcoming events |


## call_20260125_events_get

> <Array<V20260125EventsGet200ResponseInner>> call_20260125_events_get(opts)

Get all events

Returns a list of all upcoming events, optionally filtered by query parameters

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::EventsApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # Get all events
  result = api_instance.call_20260125_events_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->call_20260125_events_get: #{e}"
end
```

#### Using the call_20260125_events_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<V20260125EventsGet200ResponseInner>>, Integer, Hash)> call_20260125_events_get_with_http_info(opts)

```ruby
begin
  # Get all events
  data, status_code, headers = api_instance.call_20260125_events_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<V20260125EventsGet200ResponseInner>>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->call_20260125_events_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **groups** | **String** |  | [optional] |
| **noonline** | **String** |  | [optional] |
| **within_hours** | **String** |  | [optional] |
| **within_days** | **String** |  | [optional] |
| **noempty** | **String** |  | [optional] |

### Return type

[**Array&lt;V20260125EventsGet200ResponseInner&gt;**](V20260125EventsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json, text/plain


## call_20260125_events_next_get

> <Array<V20260125EventsGet200ResponseInner>> call_20260125_events_next_get(opts)

Get next event per group

Returns one upcoming event for each group (the next event)

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::EventsApi.new
opts = {
  groups: 'tampadevs,suncoast-js', # String | 
  noonline: '1', # String | 
  within_hours: '24', # String | 
  within_days: '7', # String | 
  noempty: '1' # String | 
}

begin
  # Get next event per group
  result = api_instance.call_20260125_events_next_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->call_20260125_events_next_get: #{e}"
end
```

#### Using the call_20260125_events_next_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<V20260125EventsGet200ResponseInner>>, Integer, Hash)> call_20260125_events_next_get_with_http_info(opts)

```ruby
begin
  # Get next event per group
  data, status_code, headers = api_instance.call_20260125_events_next_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<V20260125EventsGet200ResponseInner>>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->call_20260125_events_next_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **groups** | **String** |  | [optional] |
| **noonline** | **String** |  | [optional] |
| **within_hours** | **String** |  | [optional] |
| **within_days** | **String** |  | [optional] |
| **noempty** | **String** |  | [optional] |

### Return type

[**Array&lt;V20260125EventsGet200ResponseInner&gt;**](V20260125EventsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json, text/plain


## v1_checkin_code_post

> <VV1CheckinCodePost201Response> v1_checkin_code_post(code)

Check in to event

Self check-in using a check-in code. Optionally specify the check-in method (link, qr, nfc).

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::EventsApi.new
code = 'code_example' # String | 

begin
  # Check in to event
  result = api_instance.v1_checkin_code_post(code)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_checkin_code_post: #{e}"
end
```

#### Using the v1_checkin_code_post_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1CheckinCodePost201Response>, Integer, Hash)> v1_checkin_code_post_with_http_info(code)

```ruby
begin
  # Check in to event
  data, status_code, headers = api_instance.v1_checkin_code_post_with_http_info(code)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1CheckinCodePost201Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_checkin_code_post_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **code** | **String** |  |  |

### Return type

[**VV1CheckinCodePost201Response**](VV1CheckinCodePost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_events_event_id_rsvp_delete

> <VV1EventsEventIdRsvpDelete200Response> v1_events_event_id_rsvp_delete(event_id)

Cancel RSVP

Cancels the authenticated user's RSVP. If a waitlisted user exists, they are automatically promoted.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::EventsApi.new
event_id = 'event_id_example' # String | 

begin
  # Cancel RSVP
  result = api_instance.v1_events_event_id_rsvp_delete(event_id)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_events_event_id_rsvp_delete: #{e}"
end
```

#### Using the v1_events_event_id_rsvp_delete_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1EventsEventIdRsvpDelete200Response>, Integer, Hash)> v1_events_event_id_rsvp_delete_with_http_info(event_id)

```ruby
begin
  # Cancel RSVP
  data, status_code, headers = api_instance.v1_events_event_id_rsvp_delete_with_http_info(event_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1EventsEventIdRsvpDelete200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_events_event_id_rsvp_delete_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **event_id** | **String** |  |  |

### Return type

[**VV1EventsEventIdRsvpDelete200Response**](VV1EventsEventIdRsvpDelete200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_events_event_id_rsvp_get

> <VV1EventsEventIdRsvpGet200Response> v1_events_event_id_rsvp_get(event_id)

Get RSVP status

Returns the authenticated user's RSVP status for the specified event.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::EventsApi.new
event_id = 'event_id_example' # String | 

begin
  # Get RSVP status
  result = api_instance.v1_events_event_id_rsvp_get(event_id)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_events_event_id_rsvp_get: #{e}"
end
```

#### Using the v1_events_event_id_rsvp_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1EventsEventIdRsvpGet200Response>, Integer, Hash)> v1_events_event_id_rsvp_get_with_http_info(event_id)

```ruby
begin
  # Get RSVP status
  data, status_code, headers = api_instance.v1_events_event_id_rsvp_get_with_http_info(event_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1EventsEventIdRsvpGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_events_event_id_rsvp_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **event_id** | **String** |  |  |

### Return type

[**VV1EventsEventIdRsvpGet200Response**](VV1EventsEventIdRsvpGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_events_event_id_rsvp_post

> <VV1EventsEventIdRsvpPost201Response> v1_events_event_id_rsvp_post(event_id)

RSVP to event

Creates an RSVP for the authenticated user. If the event is at capacity, the user is placed on the waitlist.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::EventsApi.new
event_id = 'event_id_example' # String | 

begin
  # RSVP to event
  result = api_instance.v1_events_event_id_rsvp_post(event_id)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_events_event_id_rsvp_post: #{e}"
end
```

#### Using the v1_events_event_id_rsvp_post_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1EventsEventIdRsvpPost201Response>, Integer, Hash)> v1_events_event_id_rsvp_post_with_http_info(event_id)

```ruby
begin
  # RSVP to event
  data, status_code, headers = api_instance.v1_events_event_id_rsvp_post_with_http_info(event_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1EventsEventIdRsvpPost201Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_events_event_id_rsvp_post_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **event_id** | **String** |  |  |

### Return type

[**VV1EventsEventIdRsvpPost201Response**](VV1EventsEventIdRsvpPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_events_event_id_rsvp_summary_get

> <VV1EventsEventIdRsvpSummaryGet200Response> v1_events_event_id_rsvp_summary_get(event_id)

Get RSVP summary

Returns aggregate RSVP counts (confirmed, waitlisted, cancelled) for the specified event.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::EventsApi.new
event_id = 'event_id_example' # String | 

begin
  # Get RSVP summary
  result = api_instance.v1_events_event_id_rsvp_summary_get(event_id)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_events_event_id_rsvp_summary_get: #{e}"
end
```

#### Using the v1_events_event_id_rsvp_summary_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1EventsEventIdRsvpSummaryGet200Response>, Integer, Hash)> v1_events_event_id_rsvp_summary_get_with_http_info(event_id)

```ruby
begin
  # Get RSVP summary
  data, status_code, headers = api_instance.v1_events_event_id_rsvp_summary_get_with_http_info(event_id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1EventsEventIdRsvpSummaryGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_events_event_id_rsvp_summary_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **event_id** | **String** |  |  |

### Return type

[**VV1EventsEventIdRsvpSummaryGet200Response**](VV1EventsEventIdRsvpSummaryGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_events_get

> <VV1EventsGet200Response> v1_events_get(opts)

List upcoming events

Returns a paginated list of upcoming events across all groups, ordered by start time.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::EventsApi.new
opts = {
  limit: 20, # Float | 
  offset: 0 # Float | 
}

begin
  # List upcoming events
  result = api_instance.v1_events_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_events_get: #{e}"
end
```

#### Using the v1_events_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1EventsGet200Response>, Integer, Hash)> v1_events_get_with_http_info(opts)

```ruby
begin
  # List upcoming events
  data, status_code, headers = api_instance.v1_events_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1EventsGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling EventsApi->v1_events_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **limit** | **Float** |  | [optional][default to 20] |
| **offset** | **Float** |  | [optional][default to 0] |

### Return type

[**VV1EventsGet200Response**](VV1EventsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

