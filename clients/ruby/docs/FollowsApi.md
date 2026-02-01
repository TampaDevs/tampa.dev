# TampaEventsAPI::FollowsApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**v1_users_username_follow_delete**](FollowsApi.md#v1_users_username_follow_delete) | **DELETE** /v1/users/{username}/follow | Unfollow user |
| [**v1_users_username_follow_post**](FollowsApi.md#v1_users_username_follow_post) | **POST** /v1/users/{username}/follow | Follow user |
| [**v1_users_username_followers_get**](FollowsApi.md#v1_users_username_followers_get) | **GET** /v1/users/{username}/followers | List followers |
| [**v1_users_username_following_get**](FollowsApi.md#v1_users_username_following_get) | **GET** /v1/users/{username}/following | List following |


## v1_users_username_follow_delete

> v1_users_username_follow_delete(username)

Unfollow user

Unfollows the specified user.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::FollowsApi.new
username = 'username_example' # String | 

begin
  # Unfollow user
  api_instance.v1_users_username_follow_delete(username)
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FollowsApi->v1_users_username_follow_delete: #{e}"
end
```

#### Using the v1_users_username_follow_delete_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> v1_users_username_follow_delete_with_http_info(username)

```ruby
begin
  # Unfollow user
  data, status_code, headers = api_instance.v1_users_username_follow_delete_with_http_info(username)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FollowsApi->v1_users_username_follow_delete_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **username** | **String** |  |  |

### Return type

nil (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_users_username_follow_post

> <VV1UsersUsernameFollowPost200Response> v1_users_username_follow_post(username)

Follow user

Follows the specified user. Returns 200 if already following.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::FollowsApi.new
username = 'username_example' # String | 

begin
  # Follow user
  result = api_instance.v1_users_username_follow_post(username)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FollowsApi->v1_users_username_follow_post: #{e}"
end
```

#### Using the v1_users_username_follow_post_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1UsersUsernameFollowPost200Response>, Integer, Hash)> v1_users_username_follow_post_with_http_info(username)

```ruby
begin
  # Follow user
  data, status_code, headers = api_instance.v1_users_username_follow_post_with_http_info(username)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1UsersUsernameFollowPost200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FollowsApi->v1_users_username_follow_post_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **username** | **String** |  |  |

### Return type

[**VV1UsersUsernameFollowPost200Response**](VV1UsersUsernameFollowPost200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_users_username_followers_get

> <VV1UsersUsernameFollowersGet200Response> v1_users_username_followers_get(username, opts)

List followers

Returns a paginated list of users following the specified user.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::FollowsApi.new
username = 'username_example' # String | 
opts = {
  limit: 20, # Float | 
  offset: 0 # Float | 
}

begin
  # List followers
  result = api_instance.v1_users_username_followers_get(username, opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FollowsApi->v1_users_username_followers_get: #{e}"
end
```

#### Using the v1_users_username_followers_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1UsersUsernameFollowersGet200Response>, Integer, Hash)> v1_users_username_followers_get_with_http_info(username, opts)

```ruby
begin
  # List followers
  data, status_code, headers = api_instance.v1_users_username_followers_get_with_http_info(username, opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1UsersUsernameFollowersGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FollowsApi->v1_users_username_followers_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **username** | **String** |  |  |
| **limit** | **Float** |  | [optional][default to 20] |
| **offset** | **Float** |  | [optional][default to 0] |

### Return type

[**VV1UsersUsernameFollowersGet200Response**](VV1UsersUsernameFollowersGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_users_username_following_get

> <VV1UsersUsernameFollowersGet200Response> v1_users_username_following_get(username, opts)

List following

Returns a paginated list of users the specified user is following.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::FollowsApi.new
username = 'username_example' # String | 
opts = {
  limit: 20, # Float | 
  offset: 0 # Float | 
}

begin
  # List following
  result = api_instance.v1_users_username_following_get(username, opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FollowsApi->v1_users_username_following_get: #{e}"
end
```

#### Using the v1_users_username_following_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1UsersUsernameFollowersGet200Response>, Integer, Hash)> v1_users_username_following_get_with_http_info(username, opts)

```ruby
begin
  # List following
  data, status_code, headers = api_instance.v1_users_username_following_get_with_http_info(username, opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1UsersUsernameFollowersGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling FollowsApi->v1_users_username_following_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **username** | **String** |  |  |
| **limit** | **Float** |  | [optional][default to 20] |
| **offset** | **Float** |  | [optional][default to 0] |

### Return type

[**VV1UsersUsernameFollowersGet200Response**](VV1UsersUsernameFollowersGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

