# VErrorResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**error** | **str** | Human-readable error message | 
**code** | **str** | Machine-readable error code | 

## Example

```python
from tampa_events_api.models.v_error_response import VErrorResponse

# TODO update the JSON string below
json = "{}"
# create an instance of VErrorResponse from a JSON string
v_error_response_instance = VErrorResponse.from_json(json)
# print the JSON string representation of the object
print(VErrorResponse.to_json())

# convert the object into a dict
v_error_response_dict = v_error_response_instance.to_dict()
# create an instance of VErrorResponse from a dict
v_error_response_from_dict = VErrorResponse.from_dict(v_error_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


