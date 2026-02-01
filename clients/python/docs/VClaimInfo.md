# VClaimInfo


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**badge** | [**VClaimInfoBadge**](VClaimInfoBadge.md) |  | 
**group** | [**VClaimInfoGroup**](VClaimInfoGroup.md) |  | 
**claimable** | **bool** |  | 
**reason** | **str** |  | [optional] 

## Example

```python
from tampa_events_api.models.v_claim_info import VClaimInfo

# TODO update the JSON string below
json = "{}"
# create an instance of VClaimInfo from a JSON string
v_claim_info_instance = VClaimInfo.from_json(json)
# print the JSON string representation of the object
print(VClaimInfo.to_json())

# convert the object into a dict
v_claim_info_dict = v_claim_info_instance.to_dict()
# create an instance of VClaimInfo from a dict
v_claim_info_from_dict = VClaimInfo.from_dict(v_claim_info_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


