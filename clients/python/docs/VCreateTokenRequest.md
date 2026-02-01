# VCreateTokenRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** | Human-readable name for the token | 
**scopes** | **List[str]** | OAuth scopes to grant to this token | 
**expires_in_days** | **int** | Token expiry in days (1-365, default: no expiry) | [optional] 

## Example

```python
from tampa_events_api.models.v_create_token_request import VCreateTokenRequest

# TODO update the JSON string below
json = "{}"
# create an instance of VCreateTokenRequest from a JSON string
v_create_token_request_instance = VCreateTokenRequest.from_json(json)
# print the JSON string representation of the object
print(VCreateTokenRequest.to_json())

# convert the object into a dict
v_create_token_request_dict = v_create_token_request_instance.to_dict()
# create an instance of VCreateTokenRequest from a dict
v_create_token_request_from_dict = VCreateTokenRequest.from_dict(v_create_token_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


