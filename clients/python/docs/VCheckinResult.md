# VCheckinResult


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**event_id** | **str** |  | 
**checked_in_at** | **str** |  | 
**method** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_checkin_result import VCheckinResult

# TODO update the JSON string below
json = "{}"
# create an instance of VCheckinResult from a JSON string
v_checkin_result_instance = VCheckinResult.from_json(json)
# print the JSON string representation of the object
print(VCheckinResult.to_json())

# convert the object into a dict
v_checkin_result_dict = v_checkin_result_instance.to_dict()
# create an instance of VCheckinResult from a dict
v_checkin_result_from_dict = VCheckinResult.from_dict(v_checkin_result_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


