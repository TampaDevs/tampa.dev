# VServiceStatusGet200ResponseAggregation


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**last_run_at** | **str** |  | 
**duration_ms** | **float** |  | 
**groups_processed** | **float** |  | 
**groups_failed** | **float** |  | 
**data_hash** | **str** |  | 
**errors** | **List[str]** |  | 

## Example

```python
from tampa_events_api.models.v_service_status_get200_response_aggregation import VServiceStatusGet200ResponseAggregation

# TODO update the JSON string below
json = "{}"
# create an instance of VServiceStatusGet200ResponseAggregation from a JSON string
v_service_status_get200_response_aggregation_instance = VServiceStatusGet200ResponseAggregation.from_json(json)
# print the JSON string representation of the object
print(VServiceStatusGet200ResponseAggregation.to_json())

# convert the object into a dict
v_service_status_get200_response_aggregation_dict = v_service_status_get200_response_aggregation_instance.to_dict()
# create an instance of VServiceStatusGet200ResponseAggregation from a dict
v_service_status_get200_response_aggregation_from_dict = VServiceStatusGet200ResponseAggregation.from_dict(v_service_status_get200_response_aggregation_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


