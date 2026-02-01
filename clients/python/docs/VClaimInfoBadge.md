# VClaimInfoBadge


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**name** | **str** |  | 
**slug** | **str** |  | 
**description** | **str** |  | 
**icon** | **str** |  | 
**color** | **str** |  | 
**points** | **float** |  | 

## Example

```python
from tampa_events_api.models.v_claim_info_badge import VClaimInfoBadge

# TODO update the JSON string below
json = "{}"
# create an instance of VClaimInfoBadge from a JSON string
v_claim_info_badge_instance = VClaimInfoBadge.from_json(json)
# print the JSON string representation of the object
print(VClaimInfoBadge.to_json())

# convert the object into a dict
v_claim_info_badge_dict = v_claim_info_badge_instance.to_dict()
# create an instance of VClaimInfoBadge from a dict
v_claim_info_badge_from_dict = VClaimInfoBadge.from_dict(v_claim_info_badge_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


