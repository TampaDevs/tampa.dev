# TampaEventsAPI::GroupsApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**call_20260125_groups_get**](GroupsApi.md#call_20260125_groups_get) | **GET** /2026-01-25/groups | Get all public groups |
| [**call_20260125_groups_slug_get**](GroupsApi.md#call_20260125_groups_slug_get) | **GET** /2026-01-25/groups/{slug} | Get a group by slug |
| [**v1_favorites_get**](GroupsApi.md#v1_favorites_get) | **GET** /v1/favorites | List favorite groups |
| [**v1_favorites_group_slug_delete**](GroupsApi.md#v1_favorites_group_slug_delete) | **DELETE** /v1/favorites/{groupSlug} | Remove group from favorites |
| [**v1_favorites_group_slug_post**](GroupsApi.md#v1_favorites_group_slug_post) | **POST** /v1/favorites/{groupSlug} | Add group to favorites |
| [**v1_groups_get**](GroupsApi.md#v1_groups_get) | **GET** /v1/groups | List groups |
| [**v1_groups_slug_get**](GroupsApi.md#v1_groups_slug_get) | **GET** /v1/groups/{slug} | Get group details |


## call_20260125_groups_get

> <Array<V20260125GroupsGet200ResponseInner>> call_20260125_groups_get(opts)

Get all public groups

Returns a list of all groups displayed on the website

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::GroupsApi.new
opts = {
  featured: '1', # String | 
  tag: 'cloud' # String | 
}

begin
  # Get all public groups
  result = api_instance.call_20260125_groups_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->call_20260125_groups_get: #{e}"
end
```

#### Using the call_20260125_groups_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<Array<V20260125GroupsGet200ResponseInner>>, Integer, Hash)> call_20260125_groups_get_with_http_info(opts)

```ruby
begin
  # Get all public groups
  data, status_code, headers = api_instance.call_20260125_groups_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <Array<V20260125GroupsGet200ResponseInner>>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->call_20260125_groups_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **featured** | **String** |  | [optional] |
| **tag** | **String** |  | [optional] |

### Return type

[**Array&lt;V20260125GroupsGet200ResponseInner&gt;**](V20260125GroupsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## call_20260125_groups_slug_get

> <V20260125GroupsGet200ResponseInner> call_20260125_groups_slug_get(slug)

Get a group by slug

Returns a single group by its URL slug

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::GroupsApi.new
slug = 'tampadevs' # String | 

begin
  # Get a group by slug
  result = api_instance.call_20260125_groups_slug_get(slug)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->call_20260125_groups_slug_get: #{e}"
end
```

#### Using the call_20260125_groups_slug_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<V20260125GroupsGet200ResponseInner>, Integer, Hash)> call_20260125_groups_slug_get_with_http_info(slug)

```ruby
begin
  # Get a group by slug
  data, status_code, headers = api_instance.call_20260125_groups_slug_get_with_http_info(slug)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <V20260125GroupsGet200ResponseInner>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->call_20260125_groups_slug_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **slug** | **String** |  |  |

### Return type

[**V20260125GroupsGet200ResponseInner**](V20260125GroupsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_favorites_get

> <VV1FavoritesGet200Response> v1_favorites_get

List favorite groups

Returns the groups the authenticated user has favorited.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::GroupsApi.new

begin
  # List favorite groups
  result = api_instance.v1_favorites_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->v1_favorites_get: #{e}"
end
```

#### Using the v1_favorites_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1FavoritesGet200Response>, Integer, Hash)> v1_favorites_get_with_http_info

```ruby
begin
  # List favorite groups
  data, status_code, headers = api_instance.v1_favorites_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1FavoritesGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->v1_favorites_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1FavoritesGet200Response**](VV1FavoritesGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_favorites_group_slug_delete

> v1_favorites_group_slug_delete(group_slug)

Remove group from favorites

Removes a group from the authenticated user's favorites.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::GroupsApi.new
group_slug = 'group_slug_example' # String | 

begin
  # Remove group from favorites
  api_instance.v1_favorites_group_slug_delete(group_slug)
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->v1_favorites_group_slug_delete: #{e}"
end
```

#### Using the v1_favorites_group_slug_delete_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> v1_favorites_group_slug_delete_with_http_info(group_slug)

```ruby
begin
  # Remove group from favorites
  data, status_code, headers = api_instance.v1_favorites_group_slug_delete_with_http_info(group_slug)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->v1_favorites_group_slug_delete_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **group_slug** | **String** |  |  |

### Return type

nil (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_favorites_group_slug_post

> <VV1FavoritesGroupSlugPost200Response> v1_favorites_group_slug_post(group_slug)

Add group to favorites

Adds a group to the authenticated user's favorites. Returns 200 if already favorited.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::GroupsApi.new
group_slug = 'group_slug_example' # String | 

begin
  # Add group to favorites
  result = api_instance.v1_favorites_group_slug_post(group_slug)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->v1_favorites_group_slug_post: #{e}"
end
```

#### Using the v1_favorites_group_slug_post_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1FavoritesGroupSlugPost200Response>, Integer, Hash)> v1_favorites_group_slug_post_with_http_info(group_slug)

```ruby
begin
  # Add group to favorites
  data, status_code, headers = api_instance.v1_favorites_group_slug_post_with_http_info(group_slug)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1FavoritesGroupSlugPost200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->v1_favorites_group_slug_post_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **group_slug** | **String** |  |  |

### Return type

[**VV1FavoritesGroupSlugPost200Response**](VV1FavoritesGroupSlugPost200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_groups_get

> <VV1GroupsGet200Response> v1_groups_get(opts)

List groups

Returns a paginated list of groups displayed on the site, ordered by member count.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::GroupsApi.new
opts = {
  limit: 20, # Float | 
  offset: 0 # Float | 
}

begin
  # List groups
  result = api_instance.v1_groups_get(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->v1_groups_get: #{e}"
end
```

#### Using the v1_groups_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1GroupsGet200Response>, Integer, Hash)> v1_groups_get_with_http_info(opts)

```ruby
begin
  # List groups
  data, status_code, headers = api_instance.v1_groups_get_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1GroupsGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->v1_groups_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **limit** | **Float** |  | [optional][default to 20] |
| **offset** | **Float** |  | [optional][default to 0] |

### Return type

[**VV1GroupsGet200Response**](VV1GroupsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_groups_slug_get

> <VV1GroupsSlugGet200Response> v1_groups_slug_get(slug)

Get group details

Returns detailed information about a group including its upcoming events.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::GroupsApi.new
slug = 'slug_example' # String | 

begin
  # Get group details
  result = api_instance.v1_groups_slug_get(slug)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->v1_groups_slug_get: #{e}"
end
```

#### Using the v1_groups_slug_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1GroupsSlugGet200Response>, Integer, Hash)> v1_groups_slug_get_with_http_info(slug)

```ruby
begin
  # Get group details
  data, status_code, headers = api_instance.v1_groups_slug_get_with_http_info(slug)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1GroupsSlugGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling GroupsApi->v1_groups_slug_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **slug** | **String** |  |  |

### Return type

[**VV1GroupsSlugGet200Response**](VV1GroupsSlugGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

