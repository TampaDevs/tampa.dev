# VLinkedAccount


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**provider** | **str** |  | 
**provider_username** | **str** |  | 
**provider_email** | **str** |  | 
**created_at** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_linked_account import VLinkedAccount

# TODO update the JSON string below
json = "{}"
# create an instance of VLinkedAccount from a JSON string
v_linked_account_instance = VLinkedAccount.from_json(json)
# print the JSON string representation of the object
print(VLinkedAccount.to_json())

# convert the object into a dict
v_linked_account_dict = v_linked_account_instance.to_dict()
# create an instance of VLinkedAccount from a dict
v_linked_account_from_dict = VLinkedAccount.from_dict(v_linked_account_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


