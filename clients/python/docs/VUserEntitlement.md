# VUserEntitlement


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**entitlement** | **str** | Entitlement key (e.g., dev.tampa.group.create) | 
**granted_at** | **str** | ISO timestamp when entitlement was granted | 
**expires_at** | **str** | ISO timestamp when entitlement expires, or null if permanent | 
**source** | **str** | How the entitlement was granted (e.g., admin, achievement) | 

## Example

```python
from tampa_events_api.models.v_user_entitlement import VUserEntitlement

# TODO update the JSON string below
json = "{}"
# create an instance of VUserEntitlement from a JSON string
v_user_entitlement_instance = VUserEntitlement.from_json(json)
# print the JSON string representation of the object
print(VUserEntitlement.to_json())

# convert the object into a dict
v_user_entitlement_dict = v_user_entitlement_instance.to_dict()
# create an instance of VUserEntitlement from a dict
v_user_entitlement_from_dict = VUserEntitlement.from_dict(v_user_entitlement_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


