# VScope


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | 
**description** | **str** |  | 
**implies** | **List[str]** |  | 

## Example

```python
from tampa_events_api.models.v_scope import VScope

# TODO update the JSON string below
json = "{}"
# create an instance of VScope from a JSON string
v_scope_instance = VScope.from_json(json)
# print the JSON string representation of the object
print(VScope.to_json())

# convert the object into a dict
v_scope_dict = v_scope_instance.to_dict()
# create an instance of VScope from a dict
v_scope_from_dict = VScope.from_dict(v_scope_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


