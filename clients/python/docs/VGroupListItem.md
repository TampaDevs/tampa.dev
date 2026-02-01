# VGroupListItem


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**urlname** | **str** |  | 
**name** | **str** |  | 
**description** | **str** |  | 
**link** | **str** |  | 
**website** | **str** |  | 
**member_count** | **float** |  | 
**photo_url** | **str** |  | 
**tags** | **object** |  | [optional] 
**social_links** | **object** |  | [optional] 

## Example

```python
from tampa_events_api.models.v_group_list_item import VGroupListItem

# TODO update the JSON string below
json = "{}"
# create an instance of VGroupListItem from a JSON string
v_group_list_item_instance = VGroupListItem.from_json(json)
# print the JSON string representation of the object
print(VGroupListItem.to_json())

# convert the object into a dict
v_group_list_item_dict = v_group_list_item_instance.to_dict()
# create an instance of VGroupListItem from a dict
v_group_list_item_from_dict = VGroupListItem.from_dict(v_group_list_item_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


