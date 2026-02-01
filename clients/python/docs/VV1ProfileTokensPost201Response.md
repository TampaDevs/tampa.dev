# VV1ProfileTokensPost201Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | [**VTokenCreated**](VTokenCreated.md) |  | 

## Example

```python
from tampa_events_api.models.vv1_profile_tokens_post201_response import VV1ProfileTokensPost201Response

# TODO update the JSON string below
json = "{}"
# create an instance of VV1ProfileTokensPost201Response from a JSON string
vv1_profile_tokens_post201_response_instance = VV1ProfileTokensPost201Response.from_json(json)
# print the JSON string representation of the object
print(VV1ProfileTokensPost201Response.to_json())

# convert the object into a dict
vv1_profile_tokens_post201_response_dict = vv1_profile_tokens_post201_response_instance.to_dict()
# create an instance of VV1ProfileTokensPost201Response from a dict
vv1_profile_tokens_post201_response_from_dict = VV1ProfileTokensPost201Response.from_dict(vv1_profile_tokens_post201_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


