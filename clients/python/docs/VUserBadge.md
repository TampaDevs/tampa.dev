# VUserBadge


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | 
**slug** | **str** |  | 
**description** | **str** |  | 
**icon** | **str** |  | 
**icon_url** | **str** | URL to the high-quality emoji image, or null if unavailable | 
**color** | **str** |  | 
**points** | **float** |  | 
**awarded_at** | **str** |  | 
**group** | [**VUserBadgeGroup**](VUserBadgeGroup.md) |  | 
**rarity** | [**VUserBadgeRarity**](VUserBadgeRarity.md) |  | 

## Example

```python
from tampa_events_api.models.v_user_badge import VUserBadge

# TODO update the JSON string below
json = "{}"
# create an instance of VUserBadge from a JSON string
v_user_badge_instance = VUserBadge.from_json(json)
# print the JSON string representation of the object
print(VUserBadge.to_json())

# convert the object into a dict
v_user_badge_dict = v_user_badge_instance.to_dict()
# create an instance of VUserBadge from a dict
v_user_badge_from_dict = VUserBadge.from_dict(v_user_badge_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


