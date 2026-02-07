# tampa_events_api.UserApi

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**v1_me_get**](UserApi.md#v1_me_get) | **GET** /v1/me | Get current user identity
[**v1_me_linked_accounts_get**](UserApi.md#v1_me_linked_accounts_get) | **GET** /v1/me/linked-accounts | List linked OAuth accounts
[**v1_profile_achievements_get**](UserApi.md#v1_profile_achievements_get) | **GET** /v1/profile/achievements | Get achievement progress
[**v1_profile_badges_get**](UserApi.md#v1_profile_badges_get) | **GET** /v1/profile/badges | Get earned badges
[**v1_profile_entitlements_get**](UserApi.md#v1_profile_entitlements_get) | **GET** /v1/profile/entitlements | Get active entitlements
[**v1_profile_get**](UserApi.md#v1_profile_get) | **GET** /v1/profile | Get current user profile
[**v1_profile_patch**](UserApi.md#v1_profile_patch) | **PATCH** /v1/profile | Update current user profile
[**v1_profile_portfolio_get**](UserApi.md#v1_profile_portfolio_get) | **GET** /v1/profile/portfolio | List portfolio items
[**v1_profile_portfolio_id_delete**](UserApi.md#v1_profile_portfolio_id_delete) | **DELETE** /v1/profile/portfolio/{id} | Delete portfolio item
[**v1_profile_portfolio_id_patch**](UserApi.md#v1_profile_portfolio_id_patch) | **PATCH** /v1/profile/portfolio/{id} | Update portfolio item
[**v1_profile_portfolio_post**](UserApi.md#v1_profile_portfolio_post) | **POST** /v1/profile/portfolio | Create portfolio item
[**v1_profile_tokens_get**](UserApi.md#v1_profile_tokens_get) | **GET** /v1/profile/tokens | List personal access tokens
[**v1_profile_tokens_id_delete**](UserApi.md#v1_profile_tokens_id_delete) | **DELETE** /v1/profile/tokens/{id} | Revoke personal access token
[**v1_profile_tokens_post**](UserApi.md#v1_profile_tokens_post) | **POST** /v1/profile/tokens | Create personal access token


# **v1_me_get**
> VV1MeGet200Response v1_me_get()

Get current user identity

Returns basic identity information for the authenticated user. Email is included only if the `user:email` scope is granted.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_me_get200_response import VV1MeGet200Response
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
    api_instance = tampa_events_api.UserApi(api_client)

    try:
        # Get current user identity
        api_response = api_instance.v1_me_get()
        print("The response of UserApi->v1_me_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_me_get: %s\n" % e)
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

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Current user identity |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_me_linked_accounts_get**
> VV1MeLinkedAccountsGet200Response v1_me_linked_accounts_get()

List linked OAuth accounts

Returns the OAuth providers (GitHub, Discord, etc.) connected to the authenticated user's account.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_me_linked_accounts_get200_response import VV1MeLinkedAccountsGet200Response
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
    api_instance = tampa_events_api.UserApi(api_client)

    try:
        # List linked OAuth accounts
        api_response = api_instance.v1_me_linked_accounts_get()
        print("The response of UserApi->v1_me_linked_accounts_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_me_linked_accounts_get: %s\n" % e)
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

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Linked OAuth accounts |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_achievements_get**
> VV1ProfileAchievementsGet200Response v1_profile_achievements_get()

Get achievement progress

Returns all achievements with the authenticated user's progress toward each.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_profile_achievements_get200_response import VV1ProfileAchievementsGet200Response
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
    api_instance = tampa_events_api.UserApi(api_client)

    try:
        # Get achievement progress
        api_response = api_instance.v1_profile_achievements_get()
        print("The response of UserApi->v1_profile_achievements_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_achievements_get: %s\n" % e)
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

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Achievement progress |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_badges_get**
> VV1ProfileBadgesGet200Response v1_profile_badges_get()

Get earned badges

Returns all badges earned by the authenticated user, with rarity information.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_profile_badges_get200_response import VV1ProfileBadgesGet200Response
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
    api_instance = tampa_events_api.UserApi(api_client)

    try:
        # Get earned badges
        api_response = api_instance.v1_profile_badges_get()
        print("The response of UserApi->v1_profile_badges_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_badges_get: %s\n" % e)
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

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | User badges |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_entitlements_get**
> VV1ProfileEntitlementsGet200Response v1_profile_entitlements_get()

Get active entitlements

Returns all active entitlements for the authenticated user. Expired entitlements are filtered out.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_profile_entitlements_get200_response import VV1ProfileEntitlementsGet200Response
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
    api_instance = tampa_events_api.UserApi(api_client)

    try:
        # Get active entitlements
        api_response = api_instance.v1_profile_entitlements_get()
        print("The response of UserApi->v1_profile_entitlements_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_entitlements_get: %s\n" % e)
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

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | User entitlements |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_get**
> VV1ProfileGet200Response v1_profile_get()

Get current user profile

Returns the full profile for the authenticated user including bio, social links, and settings.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_profile_get200_response import VV1ProfileGet200Response
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
    api_instance = tampa_events_api.UserApi(api_client)

    try:
        # Get current user profile
        api_response = api_instance.v1_profile_get()
        print("The response of UserApi->v1_profile_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_get: %s\n" % e)
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

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Full user profile |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_patch**
> VV1ProfileGet200Response v1_profile_patch(v_update_profile_request=v_update_profile_request)

Update current user profile

Updates the authenticated user's profile fields. Only provided fields are updated.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.v_update_profile_request import VUpdateProfileRequest
from tampa_events_api.models.vv1_profile_get200_response import VV1ProfileGet200Response
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
    api_instance = tampa_events_api.UserApi(api_client)
    v_update_profile_request = tampa_events_api.VUpdateProfileRequest() # VUpdateProfileRequest |  (optional)

    try:
        # Update current user profile
        api_response = api_instance.v1_profile_patch(v_update_profile_request=v_update_profile_request)
        print("The response of UserApi->v1_profile_patch:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_patch: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v_update_profile_request** | [**VUpdateProfileRequest**](VUpdateProfileRequest.md)|  | [optional] 

### Return type

[**VV1ProfileGet200Response**](VV1ProfileGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Updated user profile |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**409** | Conflict — duplicate or state conflict |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_portfolio_get**
> VV1ProfilePortfolioGet200Response v1_profile_portfolio_get()

List portfolio items

Returns all portfolio items for the authenticated user, ordered by sort order.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_profile_portfolio_get200_response import VV1ProfilePortfolioGet200Response
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
    api_instance = tampa_events_api.UserApi(api_client)

    try:
        # List portfolio items
        api_response = api_instance.v1_profile_portfolio_get()
        print("The response of UserApi->v1_profile_portfolio_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_portfolio_get: %s\n" % e)
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

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Portfolio items |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_portfolio_id_delete**
> v1_profile_portfolio_id_delete(id)

Delete portfolio item

Permanently removes a portfolio item from the authenticated user's profile.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
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
    api_instance = tampa_events_api.UserApi(api_client)
    id = 'id_example' # str | 

    try:
        # Delete portfolio item
        api_instance.v1_profile_portfolio_id_delete(id)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_portfolio_id_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **str**|  | 

### Return type

void (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**204** | Portfolio item deleted |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_portfolio_id_patch**
> VV1ProfilePortfolioPost201Response v1_profile_portfolio_id_patch(id, v_portfolio_item_update_request=v_portfolio_item_update_request)

Update portfolio item

Updates an existing portfolio item. Only provided fields are changed.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.v_portfolio_item_update_request import VPortfolioItemUpdateRequest
from tampa_events_api.models.vv1_profile_portfolio_post201_response import VV1ProfilePortfolioPost201Response
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
    api_instance = tampa_events_api.UserApi(api_client)
    id = 'id_example' # str | 
    v_portfolio_item_update_request = tampa_events_api.VPortfolioItemUpdateRequest() # VPortfolioItemUpdateRequest |  (optional)

    try:
        # Update portfolio item
        api_response = api_instance.v1_profile_portfolio_id_patch(id, v_portfolio_item_update_request=v_portfolio_item_update_request)
        print("The response of UserApi->v1_profile_portfolio_id_patch:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_portfolio_id_patch: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **str**|  | 
 **v_portfolio_item_update_request** | [**VPortfolioItemUpdateRequest**](VPortfolioItemUpdateRequest.md)|  | [optional] 

### Return type

[**VV1ProfilePortfolioPost201Response**](VV1ProfilePortfolioPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Updated portfolio item |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_portfolio_post**
> VV1ProfilePortfolioPost201Response v1_profile_portfolio_post(v_portfolio_item_request=v_portfolio_item_request)

Create portfolio item

Adds a new portfolio item to the authenticated user's profile.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.v_portfolio_item_request import VPortfolioItemRequest
from tampa_events_api.models.vv1_profile_portfolio_post201_response import VV1ProfilePortfolioPost201Response
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
    api_instance = tampa_events_api.UserApi(api_client)
    v_portfolio_item_request = tampa_events_api.VPortfolioItemRequest() # VPortfolioItemRequest |  (optional)

    try:
        # Create portfolio item
        api_response = api_instance.v1_profile_portfolio_post(v_portfolio_item_request=v_portfolio_item_request)
        print("The response of UserApi->v1_profile_portfolio_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_portfolio_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v_portfolio_item_request** | [**VPortfolioItemRequest**](VPortfolioItemRequest.md)|  | [optional] 

### Return type

[**VV1ProfilePortfolioPost201Response**](VV1ProfilePortfolioPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Created portfolio item |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_tokens_get**
> VV1ProfileTokensGet200Response v1_profile_tokens_get()

List personal access tokens

Returns all personal access tokens for the authenticated user. Token values are not included.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_profile_tokens_get200_response import VV1ProfileTokensGet200Response
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
    api_instance = tampa_events_api.UserApi(api_client)

    try:
        # List personal access tokens
        api_response = api_instance.v1_profile_tokens_get()
        print("The response of UserApi->v1_profile_tokens_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_tokens_get: %s\n" % e)
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

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Personal access tokens |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_tokens_id_delete**
> v1_profile_tokens_id_delete(id)

Revoke personal access token

Permanently revokes a personal access token. The token can no longer be used for authentication.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
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
    api_instance = tampa_events_api.UserApi(api_client)
    id = 'id_example' # str | 

    try:
        # Revoke personal access token
        api_instance.v1_profile_tokens_id_delete(id)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_tokens_id_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **id** | **str**|  | 

### Return type

void (empty response body)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**204** | Token revoked |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_profile_tokens_post**
> VV1ProfileTokensPost201Response v1_profile_tokens_post(v_create_token_request=v_create_token_request)

Create personal access token

Creates a new personal access token. The full token value is returned only once in the response -- store it securely.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.v_create_token_request import VCreateTokenRequest
from tampa_events_api.models.vv1_profile_tokens_post201_response import VV1ProfileTokensPost201Response
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
    api_instance = tampa_events_api.UserApi(api_client)
    v_create_token_request = tampa_events_api.VCreateTokenRequest() # VCreateTokenRequest |  (optional)

    try:
        # Create personal access token
        api_response = api_instance.v1_profile_tokens_post(v_create_token_request=v_create_token_request)
        print("The response of UserApi->v1_profile_tokens_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling UserApi->v1_profile_tokens_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **v_create_token_request** | [**VCreateTokenRequest**](VCreateTokenRequest.md)|  | [optional] 

### Return type

[**VV1ProfileTokensPost201Response**](VV1ProfileTokensPost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Created token with full value |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

