# VClaimInfoGroup


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | 
**urlname** | **str** |  | 
**photo_url** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_claim_info_group import VClaimInfoGroup

# TODO update the JSON string below
json = "{}"
# create an instance of VClaimInfoGroup from a JSON string
v_claim_info_group_instance = VClaimInfoGroup.from_json(json)
# print the JSON string representation of the object
print(VClaimInfoGroup.to_json())

# convert the object into a dict
v_claim_info_group_dict = v_claim_info_group_instance.to_dict()
# create an instance of VClaimInfoGroup from a dict
v_claim_info_group_from_dict = VClaimInfoGroup.from_dict(v_claim_info_group_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


