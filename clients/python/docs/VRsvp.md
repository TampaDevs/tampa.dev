# VRsvp


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**event_id** | **str** |  | 
**status** | **str** |  | 
**rsvp_at** | **str** |  | 
**waitlist_position** | **float** |  | 

## Example

```python
from tampa_events_api.models.v_rsvp import VRsvp

# TODO update the JSON string below
json = "{}"
# create an instance of VRsvp from a JSON string
v_rsvp_instance = VRsvp.from_json(json)
# print the JSON string representation of the object
print(VRsvp.to_json())

# convert the object into a dict
v_rsvp_dict = v_rsvp_instance.to_dict()
# create an instance of VRsvp from a dict
v_rsvp_from_dict = VRsvp.from_dict(v_rsvp_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


