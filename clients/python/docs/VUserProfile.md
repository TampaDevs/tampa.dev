# VUserProfile


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**username** | **str** |  | 
**avatar_url** | **str** |  | 
**hero_image_url** | **str** |  | 
**theme_color** | **str** |  | 
**bio** | **str** |  | 
**location** | **str** |  | 
**social_links** | **List[str]** |  | 
**role** | **str** |  | 
**profile_visibility** | **str** |  | 
**show_achievements** | **bool** |  | 
**created_at** | **str** |  | 
**email** | **str** |  | [optional] 

## Example

```python
from tampa_events_api.models.v_user_profile import VUserProfile

# TODO update the JSON string below
json = "{}"
# create an instance of VUserProfile from a JSON string
v_user_profile_instance = VUserProfile.from_json(json)
# print the JSON string representation of the object
print(VUserProfile.to_json())

# convert the object into a dict
v_user_profile_dict = v_user_profile_instance.to_dict()
# create an instance of VUserProfile from a dict
v_user_profile_from_dict = VUserProfile.from_dict(v_user_profile_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


