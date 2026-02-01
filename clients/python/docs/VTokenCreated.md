# VTokenCreated


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**token** | **str** | Full token value. Store securely — it cannot be retrieved again. | 
**token_prefix** | **str** |  | 
**scopes** | **str** |  | 
**expires_at** | **str** |  | 
**created_at** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_token_created import VTokenCreated

# TODO update the JSON string below
json = "{}"
# create an instance of VTokenCreated from a JSON string
v_token_created_instance = VTokenCreated.from_json(json)
# print the JSON string representation of the object
print(VTokenCreated.to_json())

# convert the object into a dict
v_token_created_dict = v_token_created_instance.to_dict()
# create an instance of VTokenCreated from a dict
v_token_created_from_dict = VTokenCreated.from_dict(v_token_created_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


