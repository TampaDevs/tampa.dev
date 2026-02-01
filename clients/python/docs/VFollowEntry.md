# VFollowEntry


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**username** | **str** |  | 
**name** | **str** |  | 
**avatar_url** | **str** |  | 
**followed_at** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_follow_entry import VFollowEntry

# TODO update the JSON string below
json = "{}"
# create an instance of VFollowEntry from a JSON string
v_follow_entry_instance = VFollowEntry.from_json(json)
# print the JSON string representation of the object
print(VFollowEntry.to_json())

# convert the object into a dict
v_follow_entry_dict = v_follow_entry_instance.to_dict()
# create an instance of VFollowEntry from a dict
v_follow_entry_from_dict = VFollowEntry.from_dict(v_follow_entry_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


