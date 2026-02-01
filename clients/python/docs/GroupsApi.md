# tampa_events_api.GroupsApi

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**call_20260125_groups_get**](GroupsApi.md#call_20260125_groups_get) | **GET** /2026-01-25/groups | Get all public groups
[**call_20260125_groups_slug_get**](GroupsApi.md#call_20260125_groups_slug_get) | **GET** /2026-01-25/groups/{slug} | Get a group by slug
[**v1_favorites_get**](GroupsApi.md#v1_favorites_get) | **GET** /v1/favorites | List favorite groups
[**v1_favorites_group_slug_delete**](GroupsApi.md#v1_favorites_group_slug_delete) | **DELETE** /v1/favorites/{groupSlug} | Remove group from favorites
[**v1_favorites_group_slug_post**](GroupsApi.md#v1_favorites_group_slug_post) | **POST** /v1/favorites/{groupSlug} | Add group to favorites
[**v1_groups_get**](GroupsApi.md#v1_groups_get) | **GET** /v1/groups | List groups
[**v1_groups_slug_get**](GroupsApi.md#v1_groups_slug_get) | **GET** /v1/groups/{slug} | Get group details


# **call_20260125_groups_get**
> List[V20260125GroupsGet200ResponseInner] call_20260125_groups_get(featured=featured, tag=tag)

Get all public groups

Returns a list of all groups displayed on the website

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.v20260125_groups_get200_response_inner import V20260125GroupsGet200ResponseInner
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
    api_instance = tampa_events_api.GroupsApi(api_client)
    featured = '1' # str |  (optional)
    tag = 'cloud' # str |  (optional)

    try:
        # Get all public groups
        api_response = api_instance.call_20260125_groups_get(featured=featured, tag=tag)
        print("The response of GroupsApi->call_20260125_groups_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling GroupsApi->call_20260125_groups_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **featured** | **str**|  | [optional] 
 **tag** | **str**|  | [optional] 

### Return type

[**List[V20260125GroupsGet200ResponseInner]**](V20260125GroupsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | List of groups |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **call_20260125_groups_slug_get**
> V20260125GroupsGet200ResponseInner call_20260125_groups_slug_get(slug)

Get a group by slug

Returns a single group by its URL slug

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.v20260125_groups_get200_response_inner import V20260125GroupsGet200ResponseInner
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
    api_instance = tampa_events_api.GroupsApi(api_client)
    slug = 'tampadevs' # str | 

    try:
        # Get a group by slug
        api_response = api_instance.call_20260125_groups_slug_get(slug)
        print("The response of GroupsApi->call_20260125_groups_slug_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling GroupsApi->call_20260125_groups_slug_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **slug** | **str**|  | 

### Return type

[**V20260125GroupsGet200ResponseInner**](V20260125GroupsGet200ResponseInner.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Group details |  -  |
**404** | Group not found |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_favorites_get**
> VV1FavoritesGet200Response v1_favorites_get()

List favorite groups

Returns the groups the authenticated user has favorited.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_favorites_get200_response import VV1FavoritesGet200Response
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
    api_instance = tampa_events_api.GroupsApi(api_client)

    try:
        # List favorite groups
        api_response = api_instance.v1_favorites_get()
        print("The response of GroupsApi->v1_favorites_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling GroupsApi->v1_favorites_get: %s\n" % e)
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

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Favorite groups |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_favorites_group_slug_delete**
> v1_favorites_group_slug_delete(group_slug)

Remove group from favorites

Removes a group from the authenticated user's favorites.

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
    api_instance = tampa_events_api.GroupsApi(api_client)
    group_slug = 'group_slug_example' # str | 

    try:
        # Remove group from favorites
        api_instance.v1_favorites_group_slug_delete(group_slug)
    except Exception as e:
        print("Exception when calling GroupsApi->v1_favorites_group_slug_delete: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **group_slug** | **str**|  | 

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
**204** | Favorite removed |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_favorites_group_slug_post**
> VV1FavoritesGroupSlugPost200Response v1_favorites_group_slug_post(group_slug)

Add group to favorites

Adds a group to the authenticated user's favorites. Returns 200 if already favorited.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_favorites_group_slug_post200_response import VV1FavoritesGroupSlugPost200Response
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
    api_instance = tampa_events_api.GroupsApi(api_client)
    group_slug = 'group_slug_example' # str | 

    try:
        # Add group to favorites
        api_response = api_instance.v1_favorites_group_slug_post(group_slug)
        print("The response of GroupsApi->v1_favorites_group_slug_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling GroupsApi->v1_favorites_group_slug_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **group_slug** | **str**|  | 

### Return type

[**VV1FavoritesGroupSlugPost200Response**](VV1FavoritesGroupSlugPost200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Already favorited |  -  |
**201** | Group added to favorites |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_groups_get**
> VV1GroupsGet200Response v1_groups_get(limit=limit, offset=offset)

List groups

Returns a paginated list of groups displayed on the site, ordered by member count.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_groups_get200_response import VV1GroupsGet200Response
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
    api_instance = tampa_events_api.GroupsApi(api_client)
    limit = 20 # float |  (optional) (default to 20)
    offset = 0 # float |  (optional) (default to 0)

    try:
        # List groups
        api_response = api_instance.v1_groups_get(limit=limit, offset=offset)
        print("The response of GroupsApi->v1_groups_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling GroupsApi->v1_groups_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **limit** | **float**|  | [optional] [default to 20]
 **offset** | **float**|  | [optional] [default to 0]

### Return type

[**VV1GroupsGet200Response**](VV1GroupsGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Groups |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_groups_slug_get**
> VV1GroupsSlugGet200Response v1_groups_slug_get(slug)

Get group details

Returns detailed information about a group including its upcoming events.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_groups_slug_get200_response import VV1GroupsSlugGet200Response
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
    api_instance = tampa_events_api.GroupsApi(api_client)
    slug = 'slug_example' # str | 

    try:
        # Get group details
        api_response = api_instance.v1_groups_slug_get(slug)
        print("The response of GroupsApi->v1_groups_slug_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling GroupsApi->v1_groups_slug_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **slug** | **str**|  | 

### Return type

[**VV1GroupsSlugGet200Response**](VV1GroupsSlugGet200Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Group details with upcoming events |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

