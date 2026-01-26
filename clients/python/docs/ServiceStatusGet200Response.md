# ServiceStatusGet200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**platforms** | [**List[ServiceStatusGet200ResponsePlatformsInner]**](ServiceStatusGet200ResponsePlatformsInner.md) |  | 
**groups** | [**List[ServiceStatusGet200ResponseGroupsInner]**](ServiceStatusGet200ResponseGroupsInner.md) |  | 
**total_groups** | **float** |  | 
**aggregation** | [**ServiceStatusGet200ResponseAggregation**](ServiceStatusGet200ResponseAggregation.md) |  | 

## Example

```python
from tampa_events_api.models.service_status_get200_response import ServiceStatusGet200Response

# TODO update the JSON string below
json = "{}"
# create an instance of ServiceStatusGet200Response from a JSON string
service_status_get200_response_instance = ServiceStatusGet200Response.from_json(json)
# print the JSON string representation of the object
print(ServiceStatusGet200Response.to_json())

# convert the object into a dict
service_status_get200_response_dict = service_status_get200_response_instance.to_dict()
# create an instance of ServiceStatusGet200Response from a dict
service_status_get200_response_from_dict = ServiceStatusGet200Response.from_dict(service_status_get200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


