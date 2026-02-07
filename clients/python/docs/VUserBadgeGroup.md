# VUserBadgeGroup


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**urlname** | **str** |  | 
**photo_url** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_user_badge_group import VUserBadgeGroup

# TODO update the JSON string below
json = "{}"
# create an instance of VUserBadgeGroup from a JSON string
v_user_badge_group_instance = VUserBadgeGroup.from_json(json)
# print the JSON string representation of the object
print(VUserBadgeGroup.to_json())

# convert the object into a dict
v_user_badge_group_dict = v_user_badge_group_instance.to_dict()
# create an instance of VUserBadgeGroup from a dict
v_user_badge_group_from_dict = VUserBadgeGroup.from_dict(v_user_badge_group_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


