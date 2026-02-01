# tampa_events_api.ClaimsApi

All URIs are relative to *https://api.tampa.dev*

Method | HTTP request | Description
------------- | ------------- | -------------
[**v1_claim_code_get**](ClaimsApi.md#v1_claim_code_get) | **GET** /v1/claim/{code} | Get badge claim info
[**v1_claim_code_post**](ClaimsApi.md#v1_claim_code_post) | **POST** /v1/claim/{code} | Claim a badge


# **v1_claim_code_get**
> VV1ClaimCodeGet200Response v1_claim_code_get(code)

Get badge claim info

Returns information about a badge claim link. No authentication required.

### Example


```python
import tampa_events_api
from tampa_events_api.models.vv1_claim_code_get200_response import VV1ClaimCodeGet200Response
from tampa_events_api.rest import ApiException
from pprint import pprint

# Defining the host is optional and defaults to https://api.tampa.dev
# See configuration.py for a list of all supported configuration parameters.
configuration = tampa_events_api.Configuration(
    host = "https://api.tampa.dev"
)


# Enter a context with an instance of the API client
with tampa_events_api.ApiClient(configuration) as api_client:
    # Create an instance of the API class
    api_instance = tampa_events_api.ClaimsApi(api_client)
    code = 'code_example' # str | 

    try:
        # Get badge claim info
        api_response = api_instance.v1_claim_code_get(code)
        print("The response of ClaimsApi->v1_claim_code_get:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ClaimsApi->v1_claim_code_get: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **code** | **str**|  | 

### Return type

[**VV1ClaimCodeGet200Response**](VV1ClaimCodeGet200Response.md)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**200** | Claim link information |  -  |
**404** | Not Found — resource does not exist |  -  |
**410** | Gone — resource expired or exhausted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **v1_claim_code_post**
> VV1ClaimCodePost201Response v1_claim_code_post(code)

Claim a badge

Claims a badge using a claim link code. Requires authentication.

### Example

* Bearer Authentication (BearerToken):

```python
import tampa_events_api
from tampa_events_api.models.vv1_claim_code_post201_response import VV1ClaimCodePost201Response
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
    api_instance = tampa_events_api.ClaimsApi(api_client)
    code = 'code_example' # str | 

    try:
        # Claim a badge
        api_response = api_instance.v1_claim_code_post(code)
        print("The response of ClaimsApi->v1_claim_code_post:\n")
        pprint(api_response)
    except Exception as e:
        print("Exception when calling ClaimsApi->v1_claim_code_post: %s\n" % e)
```



### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **code** | **str**|  | 

### Return type

[**VV1ClaimCodePost201Response**](VV1ClaimCodePost201Response.md)

### Authorization

[BearerToken](../README.md#BearerToken)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json

### HTTP response details

| Status code | Description | Response headers |
|-------------|-------------|------------------|
**201** | Badge claimed |  -  |
**401** | Unauthorized — missing or invalid authentication |  -  |
**403** | Forbidden — insufficient scope or permissions |  -  |
**404** | Not Found — resource does not exist |  -  |
**409** | Conflict — duplicate or state conflict |  -  |
**410** | Gone — resource expired or exhausted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

