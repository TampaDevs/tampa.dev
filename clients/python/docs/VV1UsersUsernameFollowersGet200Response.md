# VV1UsersUsernameFollowersGet200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | [**List[VFollowEntry]**](VFollowEntry.md) |  | 
**pagination** | [**VPagination**](VPagination.md) |  | 

## Example

```python
from tampa_events_api.models.vv1_users_username_followers_get200_response import VV1UsersUsernameFollowersGet200Response

# TODO update the JSON string below
json = "{}"
# create an instance of VV1UsersUsernameFollowersGet200Response from a JSON string
vv1_users_username_followers_get200_response_instance = VV1UsersUsernameFollowersGet200Response.from_json(json)
# print the JSON string representation of the object
print(VV1UsersUsernameFollowersGet200Response.to_json())

# convert the object into a dict
vv1_users_username_followers_get200_response_dict = vv1_users_username_followers_get200_response_instance.to_dict()
# create an instance of VV1UsersUsernameFollowersGet200Response from a dict
vv1_users_username_followers_get200_response_from_dict = VV1UsersUsernameFollowersGet200Response.from_dict(vv1_users_username_followers_get200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


