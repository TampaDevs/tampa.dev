# VEventListItem


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**title** | **str** |  | 
**description** | **str** |  | 
**start_time** | **str** |  | 
**end_time** | **str** |  | 
**timezone** | **str** |  | 
**event_url** | **str** |  | 
**photo_url** | **str** |  | 
**event_type** | **str** |  | 
**rsvp_count** | **float** |  | 
**max_attendees** | **float** |  | 
**group** | [**VEventListItemGroup**](VEventListItemGroup.md) |  | 

## Example

```python
from tampa_events_api.models.v_event_list_item import VEventListItem

# TODO update the JSON string below
json = "{}"
# create an instance of VEventListItem from a JSON string
v_event_list_item_instance = VEventListItem.from_json(json)
# print the JSON string representation of the object
print(VEventListItem.to_json())

# convert the object into a dict
v_event_list_item_dict = v_event_list_item_instance.to_dict()
# create an instance of VEventListItem from a dict
v_event_list_item_from_dict = VEventListItem.from_dict(v_event_list_item_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


