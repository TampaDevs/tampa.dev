# VGroupDetail


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**urlname** | **str** |  | 
**name** | **str** |  | 
**description** | **str** |  | 
**link** | **str** |  | 
**website** | **str** |  | 
**member_count** | **float** |  | 
**photo_url** | **str** |  | 
**tags** | **object** |  | [optional] 
**social_links** | **object** |  | [optional] 
**upcoming_events** | [**List[VGroupDetailAllOfUpcomingEvents]**](VGroupDetailAllOfUpcomingEvents.md) |  | 

## Example

```python
from tampa_events_api.models.v_group_detail import VGroupDetail

# TODO update the JSON string below
json = "{}"
# create an instance of VGroupDetail from a JSON string
v_group_detail_instance = VGroupDetail.from_json(json)
# print the JSON string representation of the object
print(VGroupDetail.to_json())

# convert the object into a dict
v_group_detail_dict = v_group_detail_instance.to_dict()
# create an instance of VGroupDetail from a dict
v_group_detail_from_dict = VGroupDetail.from_dict(v_group_detail_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


