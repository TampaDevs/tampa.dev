# VPagination


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**total** | **float** | Total number of items (may be absent if count is expensive) | [optional] 
**limit** | **float** | Maximum items per page | 
**offset** | **float** | Number of items skipped | 
**has_more** | **bool** | Whether more items exist beyond this page | 

## Example

```python
from tampa_events_api.models.v_pagination import VPagination

# TODO update the JSON string below
json = "{}"
# create an instance of VPagination from a JSON string
v_pagination_instance = VPagination.from_json(json)
# print the JSON string representation of the object
print(VPagination.to_json())

# convert the object into a dict
v_pagination_dict = v_pagination_instance.to_dict()
# create an instance of VPagination from a dict
v_pagination_from_dict = VPagination.from_dict(v_pagination_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


