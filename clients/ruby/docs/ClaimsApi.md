# TampaEventsAPI::ClaimsApi

All URIs are relative to *https://api.tampa.dev*

| Method | HTTP request | Description |
| ------ | ------------ | ----------- |
| [**v1_claim_code_get**](ClaimsApi.md#v1_claim_code_get) | **GET** /v1/claim/{code} | Get badge claim info |
| [**v1_claim_code_post**](ClaimsApi.md#v1_claim_code_post) | **POST** /v1/claim/{code} | Claim a badge |


## v1_claim_code_get

> <VV1ClaimCodeGet200Response> v1_claim_code_get(code)

Get badge claim info

Returns information about a badge claim link. No authentication required.

### Examples

```ruby
require 'time'
require 'tampa_events_api'

api_instance = TampaEventsAPI::ClaimsApi.new
code = 'code_example' # String | 

begin
  # Get badge claim info
  result = api_instance.v1_claim_code_get(code)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling ClaimsApi->v1_claim_code_get: #{e}"
end
```

#### Using the v1_claim_code_get_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ClaimCodeGet200Response>, Integer, Hash)> v1_claim_code_get_with_http_info(code)

```ruby
begin
  # Get badge claim info
  data, status_code, headers = api_instance.v1_claim_code_get_with_http_info(code)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ClaimCodeGet200Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling ClaimsApi->v1_claim_code_get_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **code** | **String** |  |  |

### Return type

[**VV1ClaimCodeGet200Response**](VV1ClaimCodeGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## v1_claim_code_post

> <VV1ClaimCodePost201Response> v1_claim_code_post(code)

Claim a badge

Claims a badge using a claim link code. Requires authentication.

### Examples

```ruby
require 'time'
require 'tampa_events_api'
# setup authorization
TampaEventsAPI.configure do |config|
  # Configure Bearer authorization: BearerToken
  config.access_token = 'YOUR_BEARER_TOKEN'
end

api_instance = TampaEventsAPI::ClaimsApi.new
code = 'code_example' # String | 

begin
  # Claim a badge
  result = api_instance.v1_claim_code_post(code)
  p result
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling ClaimsApi->v1_claim_code_post: #{e}"
end
```

#### Using the v1_claim_code_post_with_http_info variant

This returns an Array which contains the response data, status code and headers.

> <Array(<VV1ClaimCodePost201Response>, Integer, Hash)> v1_claim_code_post_with_http_info(code)

```ruby
begin
  # Claim a badge
  data, status_code, headers = api_instance.v1_claim_code_post_with_http_info(code)
  p status_code # => 2xx
  p headers # => { ... }
  p data # => <VV1ClaimCodePost201Response>
rescue TampaEventsAPI::ApiError => e
  puts "Error when calling ClaimsApi->v1_claim_code_post_with_http_info: #{e}"
end
```

### Parameters

| Name | Type | Description | Notes |
| ---- | ---- | ----------- | ----- |
| **code** | **String** |  |  |

### Return type

[**VV1ClaimCodePost201Response**](VV1ClaimCodePost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

