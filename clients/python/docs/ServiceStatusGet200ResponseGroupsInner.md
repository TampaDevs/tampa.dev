# ServiceStatusGet200ResponseGroupsInner


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**urlname** | **str** |  | 
**platform** | **str** |  | 

## Example

```python
from tampa_events_api.models.service_status_get200_response_groups_inner import ServiceStatusGet200ResponseGroupsInner

# TODO update the JSON string below
json = "{}"
# create an instance of ServiceStatusGet200ResponseGroupsInner from a JSON string
service_status_get200_response_groups_inner_instance = ServiceStatusGet200ResponseGroupsInner.from_json(json)
# print the JSON string representation of the object
print(ServiceStatusGet200ResponseGroupsInner.to_json())

# convert the object into a dict
service_status_get200_response_groups_inner_dict = service_status_get200_response_groups_inner_instance.to_dict()
# create an instance of ServiceStatusGet200ResponseGroupsInner from a dict
service_status_get200_response_groups_inner_from_dict = ServiceStatusGet200ResponseGroupsInner.from_dict(service_status_get200_response_groups_inner_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


