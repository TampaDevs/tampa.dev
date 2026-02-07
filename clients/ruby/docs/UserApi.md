# TampaEventsAPI::UserApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**v1_me_get**](UserApi.md#v1_me_get) | **GET** /v1/me | Get current user identity |
| [**v1_me_linked_accounts_get**](UserApi.md#v1_me_linked_accounts_get) | **GET** /v1/me/linked-accounts | List linked OAuth accounts |
| [**v1_profile_achievements_get**](UserApi.md#v1_profile_achievements_get) | **GET** /v1/profile/achievements | Get achievement progress |
| [**v1_profile_badges_get**](UserApi.md#v1_profile_badges_get) | **GET** /v1/profile/badges | Get earned badges |
| [**v1_profile_entitlements_get**](UserApi.md#v1_profile_entitlements_get) | **GET** /v1/profile/entitlements | Get active entitlements |
| [**v1_profile_get**](UserApi.md#v1_profile_get) | **GET** /v1/profile | Get current user profile |
| [**v1_profile_patch**](UserApi.md#v1_profile_patch) | **PATCH** /v1/profile | Update current user profile |
| [**v1_profile_portfolio_get**](UserApi.md#v1_profile_portfolio_get) | **GET** /v1/profile/portfolio | List portfolio items |
| [**v1_profile_portfolio_id_delete**](UserApi.md#v1_profile_portfolio_id_delete) | **DELETE** /v1/profile/portfolio/{id} | Delete portfolio item |
| [**v1_profile_portfolio_id_patch**](UserApi.md#v1_profile_portfolio_id_patch) | **PATCH** /v1/profile/portfolio/{id} | Update portfolio item |
| [**v1_profile_portfolio_post**](UserApi.md#v1_profile_portfolio_post) | **POST** /v1/profile/portfolio | Create portfolio item |
| [**v1_profile_tokens_get**](UserApi.md#v1_profile_tokens_get) | **GET** /v1/profile/tokens | List personal access tokens |
| [**v1_profile_tokens_id_delete**](UserApi.md#v1_profile_tokens_id_delete) | **DELETE** /v1/profile/tokens/{id} | Revoke personal access token |
| [**v1_profile_tokens_post**](UserApi.md#v1_profile_tokens_post) | **POST** /v1/profile/tokens | Create personal access token |


## v1_me_get

> <VV1MeGet200Response> v1_me_get

Get current user identity

Returns basic identity information for the authenticated user. Email is included only if the `user:email` scope is granted.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new

begin
  # Get current user identity
  result = api_instance.v1_me_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_me_get: #{e}"
end
```

#### Using the v1_me_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1MeGet200Response>, Integer, Hash)> v1_me_get_with_http_info

```ruby
begin
  # Get current user identity
  data, status_code, headers = api_instance.v1_me_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1MeGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_me_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1MeGet200Response**](VV1MeGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_me_linked_accounts_get

> <VV1MeLinkedAccountsGet200Response> v1_me_linked_accounts_get

List linked OAuth accounts

Returns the OAuth providers (GitHub, Discord, etc.) connected to the authenticated user's account.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new

begin
  # List linked OAuth accounts
  result = api_instance.v1_me_linked_accounts_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_me_linked_accounts_get: #{e}"
end
```

#### Using the v1_me_linked_accounts_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1MeLinkedAccountsGet200Response>, Integer, Hash)> v1_me_linked_accounts_get_with_http_info

```ruby
begin
  # List linked OAuth accounts
  data, status_code, headers = api_instance.v1_me_linked_accounts_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1MeLinkedAccountsGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_me_linked_accounts_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1MeLinkedAccountsGet200Response**](VV1MeLinkedAccountsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_profile_achievements_get

> <VV1ProfileAchievementsGet200Response> v1_profile_achievements_get

Get achievement progress

Returns all achievements with the authenticated user's progress toward each.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new

begin
  # Get achievement progress
  result = api_instance.v1_profile_achievements_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_achievements_get: #{e}"
end
```

#### Using the v1_profile_achievements_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ProfileAchievementsGet200Response>, Integer, Hash)> v1_profile_achievements_get_with_http_info

```ruby
begin
  # Get achievement progress
  data, status_code, headers = api_instance.v1_profile_achievements_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ProfileAchievementsGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_achievements_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1ProfileAchievementsGet200Response**](VV1ProfileAchievementsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_profile_badges_get

> <VV1ProfileBadgesGet200Response> v1_profile_badges_get

Get earned badges

Returns all badges earned by the authenticated user, with rarity information.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new

begin
  # Get earned badges
  result = api_instance.v1_profile_badges_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_badges_get: #{e}"
end
```

#### Using the v1_profile_badges_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ProfileBadgesGet200Response>, Integer, Hash)> v1_profile_badges_get_with_http_info

```ruby
begin
  # Get earned badges
  data, status_code, headers = api_instance.v1_profile_badges_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ProfileBadgesGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_badges_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1ProfileBadgesGet200Response**](VV1ProfileBadgesGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_profile_entitlements_get

> <VV1ProfileEntitlementsGet200Response> v1_profile_entitlements_get

Get active entitlements

Returns all active entitlements for the authenticated user. Expired entitlements are filtered out.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new

begin
  # Get active entitlements
  result = api_instance.v1_profile_entitlements_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_entitlements_get: #{e}"
end
```

#### Using the v1_profile_entitlements_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ProfileEntitlementsGet200Response>, Integer, Hash)> v1_profile_entitlements_get_with_http_info

```ruby
begin
  # Get active entitlements
  data, status_code, headers = api_instance.v1_profile_entitlements_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ProfileEntitlementsGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_entitlements_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1ProfileEntitlementsGet200Response**](VV1ProfileEntitlementsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_profile_get

> <VV1ProfileGet200Response> v1_profile_get

Get current user profile

Returns the full profile for the authenticated user including bio, social links, and settings.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new

begin
  # Get current user profile
  result = api_instance.v1_profile_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_get: #{e}"
end
```

#### Using the v1_profile_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ProfileGet200Response>, Integer, Hash)> v1_profile_get_with_http_info

```ruby
begin
  # Get current user profile
  data, status_code, headers = api_instance.v1_profile_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ProfileGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1ProfileGet200Response**](VV1ProfileGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_profile_patch

> <VV1ProfileGet200Response> v1_profile_patch(opts)

Update current user profile

Updates the authenticated user's profile fields. Only provided fields are updated.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new
opts = {
  v_update_profile_request: TampaEventsAPI::VUpdateProfileRequest.new # VUpdateProfileRequest | 
}

begin
  # Update current user profile
  result = api_instance.v1_profile_patch(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_patch: #{e}"
end
```

#### Using the v1_profile_patch_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ProfileGet200Response>, Integer, Hash)> v1_profile_patch_with_http_info(opts)

```ruby
begin
  # Update current user profile
  data, status_code, headers = api_instance.v1_profile_patch_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ProfileGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_patch_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **v_update_profile_request** | [**VUpdateProfileRequest**](VUpdateProfileRequest.md) |  | [optional] |

### Return type

[**VV1ProfileGet200Response**](VV1ProfileGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## v1_profile_portfolio_get

> <VV1ProfilePortfolioGet200Response> v1_profile_portfolio_get

List portfolio items

Returns all portfolio items for the authenticated user, ordered by sort order.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new

begin
  # List portfolio items
  result = api_instance.v1_profile_portfolio_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_portfolio_get: #{e}"
end
```

#### Using the v1_profile_portfolio_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ProfilePortfolioGet200Response>, Integer, Hash)> v1_profile_portfolio_get_with_http_info

```ruby
begin
  # List portfolio items
  data, status_code, headers = api_instance.v1_profile_portfolio_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ProfilePortfolioGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_portfolio_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1ProfilePortfolioGet200Response**](VV1ProfilePortfolioGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_profile_portfolio_id_delete

> v1_profile_portfolio_id_delete(id)

Delete portfolio item

Permanently removes a portfolio item from the authenticated user's profile.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new
id = 'id_example' # String | 

begin
  # Delete portfolio item
  api_instance.v1_profile_portfolio_id_delete(id)
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_portfolio_id_delete: #{e}"
end
```

#### Using the v1_profile_portfolio_id_delete_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> v1_profile_portfolio_id_delete_with_http_info(id)

```ruby
begin
  # Delete portfolio item
  data, status_code, headers = api_instance.v1_profile_portfolio_id_delete_with_http_info(id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_portfolio_id_delete_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **id** | **String** |  |  |

### Return type

nil (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_profile_portfolio_id_patch

> <VV1ProfilePortfolioPost201Response> v1_profile_portfolio_id_patch(id, opts)

Update portfolio item

Updates an existing portfolio item. Only provided fields are changed.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new
id = 'id_example' # String | 
opts = {
  v_portfolio_item_update_request: TampaEventsAPI::VPortfolioItemUpdateRequest.new # VPortfolioItemUpdateRequest | 
}

begin
  # Update portfolio item
  result = api_instance.v1_profile_portfolio_id_patch(id, opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_portfolio_id_patch: #{e}"
end
```

#### Using the v1_profile_portfolio_id_patch_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ProfilePortfolioPost201Response>, Integer, Hash)> v1_profile_portfolio_id_patch_with_http_info(id, opts)

```ruby
begin
  # Update portfolio item
  data, status_code, headers = api_instance.v1_profile_portfolio_id_patch_with_http_info(id, opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ProfilePortfolioPost201Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_portfolio_id_patch_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **id** | **String** |  |  |
| **v_portfolio_item_update_request** | [**VPortfolioItemUpdateRequest**](VPortfolioItemUpdateRequest.md) |  | [optional] |

### Return type

[**VV1ProfilePortfolioPost201Response**](VV1ProfilePortfolioPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## v1_profile_portfolio_post

> <VV1ProfilePortfolioPost201Response> v1_profile_portfolio_post(opts)

Create portfolio item

Adds a new portfolio item to the authenticated user's profile.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new
opts = {
  v_portfolio_item_request: TampaEventsAPI::VPortfolioItemRequest.new({title: 'title_example'}) # VPortfolioItemRequest | 
}

begin
  # Create portfolio item
  result = api_instance.v1_profile_portfolio_post(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_portfolio_post: #{e}"
end
```

#### Using the v1_profile_portfolio_post_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ProfilePortfolioPost201Response>, Integer, Hash)> v1_profile_portfolio_post_with_http_info(opts)

```ruby
begin
  # Create portfolio item
  data, status_code, headers = api_instance.v1_profile_portfolio_post_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ProfilePortfolioPost201Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_portfolio_post_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **v_portfolio_item_request** | [**VPortfolioItemRequest**](VPortfolioItemRequest.md) |  | [optional] |

### Return type

[**VV1ProfilePortfolioPost201Response**](VV1ProfilePortfolioPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json


## v1_profile_tokens_get

> <VV1ProfileTokensGet200Response> v1_profile_tokens_get

List personal access tokens

Returns all personal access tokens for the authenticated user. Token values are not included.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new

begin
  # List personal access tokens
  result = api_instance.v1_profile_tokens_get
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_tokens_get: #{e}"
end
```

#### Using the v1_profile_tokens_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ProfileTokensGet200Response>, Integer, Hash)> v1_profile_tokens_get_with_http_info

```ruby
begin
  # List personal access tokens
  data, status_code, headers = api_instance.v1_profile_tokens_get_with_http_info
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ProfileTokensGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_tokens_get_with_http_info: #{e}"
end
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**VV1ProfileTokensGet200Response**](VV1ProfileTokensGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_profile_tokens_id_delete

> v1_profile_tokens_id_delete(id)

Revoke personal access token

Permanently revokes a personal access token. The token can no longer be used for authentication.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new
id = 'id_example' # String | 

begin
  # Revoke personal access token
  api_instance.v1_profile_tokens_id_delete(id)
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_tokens_id_delete: #{e}"
end
```

#### Using the v1_profile_tokens_id_delete_with_http_info variant

This returns an Array which contains the response data (`nil` in this case), status code and headers.

> <Array(nil, Integer, Hash)> v1_profile_tokens_id_delete_with_http_info(id)

```ruby
begin
  # Revoke personal access token
  data, status_code, headers = api_instance.v1_profile_tokens_id_delete_with_http_info(id)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => nil
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_tokens_id_delete_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **id** | **String** |  |  |

### Return type

nil (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_profile_tokens_post

> <VV1ProfileTokensPost201Response> v1_profile_tokens_post(opts)

Create personal access token

Creates a new personal access token. The full token value is returned only once in the response -- store it securely.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::UserApi.new
opts = {
  v_create_token_request: TampaEventsAPI::VCreateTokenRequest.new({name: 'name_example', scopes: ['scopes_example']}) # VCreateTokenRequest | 
}

begin
  # Create personal access token
  result = api_instance.v1_profile_tokens_post(opts)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_tokens_post: #{e}"
end
```

#### Using the v1_profile_tokens_post_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ProfileTokensPost201Response>, Integer, Hash)> v1_profile_tokens_post_with_http_info(opts)

```ruby
begin
  # Create personal access token
  data, status_code, headers = api_instance.v1_profile_tokens_post_with_http_info(opts)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ProfileTokensPost201Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling UserApi->v1_profile_tokens_post_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **v_create_token_request** | [**VCreateTokenRequest**](VCreateTokenRequest.md) |  | [optional] |

### Return type

[**VV1ProfileTokensPost201Response**](VV1ProfileTokensPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: application/json
- **Accept**: application/json

