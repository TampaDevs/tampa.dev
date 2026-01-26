# VServiceStatusGet200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**platforms** | [**List[VServiceStatusGet200ResponsePlatformsInner]**](VServiceStatusGet200ResponsePlatformsInner.md) |  | 
**groups** | [**List[VServiceStatusGet200ResponseGroupsInner]**](VServiceStatusGet200ResponseGroupsInner.md) |  | 
**total_groups** | **float** |  | 
**aggregation** | [**VServiceStatusGet200ResponseAggregation**](VServiceStatusGet200ResponseAggregation.md) |  | [optional] 

## Example

```python
from tampa_events_api.models.v_service_status_get200_response import VServiceStatusGet200Response

# TODO update the JSON string below
json = "{}"
# create an instance of VServiceStatusGet200Response from a JSON string
v_service_status_get200_response_instance = VServiceStatusGet200Response.from_json(json)
# print the JSON string representation of the object
print(VServiceStatusGet200Response.to_json())

# convert the object into a dict
v_service_status_get200_response_dict = v_service_status_get200_response_instance.to_dict()
# create an instance of VServiceStatusGet200Response from a dict
v_service_status_get200_response_from_dict = VServiceStatusGet200Response.from_dict(v_service_status_get200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


