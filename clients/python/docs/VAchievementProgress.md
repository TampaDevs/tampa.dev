# VAchievementProgress


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**key** | **str** |  | 
**name** | **str** |  | 
**description** | **str** |  | 
**icon** | **str** |  | 
**color** | **str** |  | 
**target_value** | **float** |  | 
**current_value** | **float** |  | 
**completed_at** | **str** |  | 
**badge_slug** | **str** |  | 
**hidden** | **bool** |  | 

## Example

```python
from tampa_events_api.models.v_achievement_progress import VAchievementProgress

# TODO update the JSON string below
json = "{}"
# create an instance of VAchievementProgress from a JSON string
v_achievement_progress_instance = VAchievementProgress.from_json(json)
# print the JSON string representation of the object
print(VAchievementProgress.to_json())

# convert the object into a dict
v_achievement_progress_dict = v_achievement_progress_instance.to_dict()
# create an instance of VAchievementProgress from a dict
v_achievement_progress_from_dict = VAchievementProgress.from_dict(v_achievement_progress_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


