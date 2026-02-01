# VEventListItemGroup


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**name** | **str** |  | 
**urlname** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_event_list_item_group import VEventListItemGroup

# TODO update the JSON string below
json = "{}"
# create an instance of VEventListItemGroup from a JSON string
v_event_list_item_group_instance = VEventListItemGroup.from_json(json)
# print the JSON string representation of the object
print(VEventListItemGroup.to_json())

# convert the object into a dict
v_event_list_item_group_dict = v_event_list_item_group_instance.to_dict()
# create an instance of VEventListItemGroup from a dict
v_event_list_item_group_from_dict = VEventListItemGroup.from_dict(v_event_list_item_group_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


