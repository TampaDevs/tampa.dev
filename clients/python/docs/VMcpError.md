# VMcpError


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**error** | **str** |  | 
**code** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_mcp_error import VMcpError

# TODO update the JSON string below
json = "{}"
# create an instance of VMcpError from a JSON string
v_mcp_error_instance = VMcpError.from_json(json)
# print the JSON string representation of the object
print(VMcpError.to_json())

# convert the object into a dict
v_mcp_error_dict = v_mcp_error_instance.to_dict()
# create an instance of VMcpError from a dict
v_mcp_error_from_dict = VMcpError.from_dict(v_mcp_error_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


