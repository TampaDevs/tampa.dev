# VRsvpSummary


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**total** | **float** |  | 
**confirmed** | **float** |  | 
**waitlisted** | **float** |  | 
**cancelled** | **float** |  | 
**capacity** | **float** |  | 

## Example

```python
from tampa_events_api.models.v_rsvp_summary import VRsvpSummary

# TODO update the JSON string below
json = "{}"
# create an instance of VRsvpSummary from a JSON string
v_rsvp_summary_instance = VRsvpSummary.from_json(json)
# print the JSON string representation of the object
print(VRsvpSummary.to_json())

# convert the object into a dict
v_rsvp_summary_dict = v_rsvp_summary_instance.to_dict()
# create an instance of VRsvpSummary from a dict
v_rsvp_summary_from_dict = VRsvpSummary.from_dict(v_rsvp_summary_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


