# VClaimBadgeResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**badge** | [**VClaimBadgeResponseBadge**](VClaimBadgeResponseBadge.md) |  | 

## Example

```python
from tampa_events_api.models.v_claim_badge_response import VClaimBadgeResponse

# TODO update the JSON string below
json = "{}"
# create an instance of VClaimBadgeResponse from a JSON string
v_claim_badge_response_instance = VClaimBadgeResponse.from_json(json)
# print the JSON string representation of the object
print(VClaimBadgeResponse.to_json())

# convert the object into a dict
v_claim_badge_response_dict = v_claim_badge_response_instance.to_dict()
# create an instance of VClaimBadgeResponse from a dict
v_claim_badge_response_from_dict = VClaimBadgeResponse.from_dict(v_claim_badge_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


