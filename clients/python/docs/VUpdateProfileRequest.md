# VUpdateProfileRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | [optional] 
**avatar_url** | **str** |  | [optional] 
**hero_image_url** | **str** |  | [optional] 
**theme_color** | **str** |  | [optional] 
**username** | **str** |  | [optional] 
**bio** | **str** |  | [optional] 
**location** | **str** |  | [optional] 
**social_links** | **List[str]** |  | [optional] 
**show_achievements** | **bool** |  | [optional] 
**profile_visibility** | **str** |  | [optional] 

## Example

```python
from tampa_events_api.models.v_update_profile_request import VUpdateProfileRequest

# TODO update the JSON string below
json = "{}"
# create an instance of VUpdateProfileRequest from a JSON string
v_update_profile_request_instance = VUpdateProfileRequest.from_json(json)
# print the JSON string representation of the object
print(VUpdateProfileRequest.to_json())

# convert the object into a dict
v_update_profile_request_dict = v_update_profile_request_instance.to_dict()
# create an instance of VUpdateProfileRequest from a dict
v_update_profile_request_from_dict = VUpdateProfileRequest.from_dict(v_update_profile_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


