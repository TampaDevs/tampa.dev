# Model20260125EventsGet200ResponseInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**title** | **str** |  | 
**description** | **str** |  | [optional] 
**date_time** | **str** |  | 
**duration** | **str** |  | [optional] 
**event_url** | **str** |  | 
**status** | **str** |  | 
**event_type** | **str** |  | [optional] 
**rsvp_count** | **float** |  | 
**venues** | **List[object]** |  | 
**photo** | **object** |  | [optional] 
**group** | **object** |  | [optional] 
**address** | **str** |  | 
**google_maps_url** | **str** |  | 
**photo_url** | **str** |  | 
**is_online** | **bool** |  | 

## Example

```python
from tampa_events_api.models.model20260125_events_get200_response_inner import Model20260125EventsGet200ResponseInner

# TODO update the JSON string below
json = "{}"
# create an instance of Model20260125EventsGet200ResponseInner from a JSON string
model20260125_events_get200_response_inner_instance = Model20260125EventsGet200ResponseInner.from_json(json)
# print the JSON string representation of the object
print(Model20260125EventsGet200ResponseInner.to_json())

# convert the object into a dict
model20260125_events_get200_response_inner_dict = model20260125_events_get200_response_inner_instance.to_dict()
# create an instance of Model20260125EventsGet200ResponseInner from a dict
model20260125_events_get200_response_inner_from_dict = Model20260125EventsGet200ResponseInner.from_dict(model20260125_events_get200_response_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


