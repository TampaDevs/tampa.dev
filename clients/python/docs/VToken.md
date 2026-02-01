# VToken


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**token_prefix** | **str** |  | 
**scopes** | **str** |  | 
**expires_at** | **str** |  | 
**created_at** | **str** |  | 
**last_used_at** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_token import VToken

# TODO update the JSON string below
json = "{}"
# create an instance of VToken from a JSON string
v_token_instance = VToken.from_json(json)
# print the JSON string representation of the object
print(VToken.to_json())

# convert the object into a dict
v_token_dict = v_token_instance.to_dict()
# create an instance of VToken from a dict
v_token_from_dict = VToken.from_dict(v_token_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


