# VRsvpStatusResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**rsvp** | [**VRsvp**](VRsvp.md) |  | 

## Example

```python
from tampa_events_api.models.v_rsvp_status_response import VRsvpStatusResponse

# TODO update the JSON string below
json = "{}"
# create an instance of VRsvpStatusResponse from a JSON string
v_rsvp_status_response_instance = VRsvpStatusResponse.from_json(json)
# print the JSON string representation of the object
print(VRsvpStatusResponse.to_json())

# convert the object into a dict
v_rsvp_status_response_dict = v_rsvp_status_response_instance.to_dict()
# create an instance of VRsvpStatusResponse from a dict
v_rsvp_status_response_from_dict = VRsvpStatusResponse.from_dict(v_rsvp_status_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


