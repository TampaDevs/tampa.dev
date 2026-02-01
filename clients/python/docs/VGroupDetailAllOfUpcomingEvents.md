# VGroupDetailAllOfUpcomingEvents


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**title** | **str** |  | 
**start_time** | **str** |  | 
**event_url** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_group_detail_all_of_upcoming_events import VGroupDetailAllOfUpcomingEvents

# TODO update the JSON string below
json = "{}"
# create an instance of VGroupDetailAllOfUpcomingEvents from a JSON string
v_group_detail_all_of_upcoming_events_instance = VGroupDetailAllOfUpcomingEvents.from_json(json)
# print the JSON string representation of the object
print(VGroupDetailAllOfUpcomingEvents.to_json())

# convert the object into a dict
v_group_detail_all_of_upcoming_events_dict = v_group_detail_all_of_upcoming_events_instance.to_dict()
# create an instance of VGroupDetailAllOfUpcomingEvents from a dict
v_group_detail_all_of_upcoming_events_from_dict = VGroupDetailAllOfUpcomingEvents.from_dict(v_group_detail_all_of_upcoming_events_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


