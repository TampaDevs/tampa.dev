# tampa_events_api.FollowsApi

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**v1_users_username_follow_delete**](FollowsApi.md#v1_users_username_follow_delete) | **DELETE** /v1/users/{username}/follow | Unfollow user
[**v1_users_username_follow_post**](FollowsApi.md#v1_users_username_follow_post) | **POST** /v1/users/{username}/follow | Follow user
[**v1_users_username_followers_get**](FollowsApi.md#v1_users_username_followers_get) | **GET** /v1/users/{username}/followers | List followers
[**v1_users_username_following_get**](FollowsApi.md#v1_users_username_following_get) | **GET** /v1/users/{username}/following | List following


# **v1_users_username_follow_delete**
> v1_users_username_follow_delete(username)

Unfollow user

Unfollows the specified user.

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
    api_instance = tampa_events_api.FollowsApi(api_client)
    username = 'username_example' # str | 

    try:
        # Unfollow user
        api_instance.v1_users_username_follow_delete(username)
    except Exception as e:
        print("Exception when calling FollowsApi->v1_users_username_follow_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **username** | **str**|  | 

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
**204** | Unfollowed |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_users_username_follow_post**
> VV1UsersUsernameFollowPost200Response v1_users_username_follow_post(username)

Follow user

Follows the specified user. Returns 200 if already following.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_users_username_follow_post200_response import VV1UsersUsernameFollowPost200Response
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
    api_instance = tampa_events_api.FollowsApi(api_client)
    username = 'username_example' # str | 

    try:
        # Follow user
        api_response = api_instance.v1_users_username_follow_post(username)
        print("The response of FollowsApi->v1_users_username_follow_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FollowsApi->v1_users_username_follow_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **username** | **str**|  | 

### Return type

[**VV1UsersUsernameFollowPost200Response**](VV1UsersUsernameFollowPost200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Already following |  -  |
**201** | Now following user |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_users_username_followers_get**
> VV1UsersUsernameFollowersGet200Response v1_users_username_followers_get(username, limit=limit, offset=offset)

List followers

Returns a paginated list of users following the specified user.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_users_username_followers_get200_response import VV1UsersUsernameFollowersGet200Response
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
    api_instance = tampa_events_api.FollowsApi(api_client)
    username = 'username_example' # str | 
    limit = 20 # float |  (optional) (default to 20)
    offset = 0 # float |  (optional) (default to 0)

    try:
        # List followers
        api_response = api_instance.v1_users_username_followers_get(username, limit=limit, offset=offset)
        print("The response of FollowsApi->v1_users_username_followers_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FollowsApi->v1_users_username_followers_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **username** | **str**|  | 
 **limit** | **float**|  | [optional] [default to 20]
 **offset** | **float**|  | [optional] [default to 0]

### Return type

[**VV1UsersUsernameFollowersGet200Response**](VV1UsersUsernameFollowersGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Followers |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_users_username_following_get**
> VV1UsersUsernameFollowersGet200Response v1_users_username_following_get(username, limit=limit, offset=offset)

List following

Returns a paginated list of users the specified user is following.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_users_username_followers_get200_response import VV1UsersUsernameFollowersGet200Response
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
    api_instance = tampa_events_api.FollowsApi(api_client)
    username = 'username_example' # str | 
    limit = 20 # float |  (optional) (default to 20)
    offset = 0 # float |  (optional) (default to 0)

    try:
        # List following
        api_response = api_instance.v1_users_username_following_get(username, limit=limit, offset=offset)
        print("The response of FollowsApi->v1_users_username_following_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling FollowsApi->v1_users_username_following_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **username** | **str**|  | 
 **limit** | **float**|  | [optional] [default to 20]
 **offset** | **float**|  | [optional] [default to 0]

### Return type

[**VV1UsersUsernameFollowersGet200Response**](VV1UsersUsernameFollowersGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Following |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

