# V20260125GroupsGet200ResponseInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**urlname** | **str** |  | 
**name** | **str** |  | 
**description** | **str** |  | 
**link** | **str** |  | 
**website** | **str** |  | 
**platform** | **str** |  | 
**member_count** | **float** |  | 
**photo_url** | **str** |  | 
**is_featured** | **bool** |  | 
**display_on_site** | **bool** |  | 
**tags** | **List[str]** |  | 
**social_links** | [**V20260125GroupsGet200ResponseInnerSocialLinks**](V20260125GroupsGet200ResponseInnerSocialLinks.md) |  | 
**favorites_count** | **float** |  | [optional] 

## Example

```python
from tampa_events_api.models.v20260125_groups_get200_response_inner import V20260125GroupsGet200ResponseInner

# TODO update the JSON string below
json = "{}"
# create an instance of V20260125GroupsGet200ResponseInner from a JSON string
v20260125_groups_get200_response_inner_instance = V20260125GroupsGet200ResponseInner.from_json(json)
# print the JSON string representation of the object
print(V20260125GroupsGet200ResponseInner.to_json())

# convert the object into a dict
v20260125_groups_get200_response_inner_dict = v20260125_groups_get200_response_inner_instance.to_dict()
# create an instance of V20260125GroupsGet200ResponseInner from a dict
v20260125_groups_get200_response_inner_from_dict = V20260125GroupsGet200ResponseInner.from_dict(v20260125_groups_get200_response_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


