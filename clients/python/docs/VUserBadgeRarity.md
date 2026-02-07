# VUserBadgeRarity


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**tier** | **str** |  | 
**percentage** | **float** |  | 

## Example

```python
from tampa_events_api.models.v_user_badge_rarity import VUserBadgeRarity

# TODO update the JSON string below
json = "{}"
# create an instance of VUserBadgeRarity from a JSON string
v_user_badge_rarity_instance = VUserBadgeRarity.from_json(json)
# print the JSON string representation of the object
print(VUserBadgeRarity.to_json())

# convert the object into a dict
v_user_badge_rarity_dict = v_user_badge_rarity_instance.to_dict()
# create an instance of VUserBadgeRarity from a dict
v_user_badge_rarity_from_dict = VUserBadgeRarity.from_dict(v_user_badge_rarity_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


