# VUserBasic


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**avatar_url** | **str** |  | 
**username** | **str** |  | 
**email** | **str** |  | [optional] 

## Example

```python
from tampa_events_api.models.v_user_basic import VUserBasic

# TODO update the JSON string below
json = "{}"
# create an instance of VUserBasic from a JSON string
v_user_basic_instance = VUserBasic.from_json(json)
# print the JSON string representation of the object
print(VUserBasic.to_json())

# convert the object into a dict
v_user_basic_dict = v_user_basic_instance.to_dict()
# create an instance of VUserBasic from a dict
v_user_basic_from_dict = VUserBasic.from_dict(v_user_basic_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


