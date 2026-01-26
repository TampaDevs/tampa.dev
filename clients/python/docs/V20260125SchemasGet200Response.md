# V20260125SchemasGet200Response


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**schemas** | [**List[V20260125SchemasGet200ResponseSchemasInner]**](V20260125SchemasGet200ResponseSchemasInner.md) |  | 
**version** | **str** |  | 

## Example

```python
from tampa_events_api.models.v20260125_schemas_get200_response import V20260125SchemasGet200Response

# TODO update the JSON string below
json = "{}"
# create an instance of V20260125SchemasGet200Response from a JSON string
v20260125_schemas_get200_response_instance = V20260125SchemasGet200Response.from_json(json)
# print the JSON string representation of the object
print(V20260125SchemasGet200Response.to_json())

# convert the object into a dict
v20260125_schemas_get200_response_dict = v20260125_schemas_get200_response_instance.to_dict()
# create an instance of V20260125SchemasGet200Response from a dict
v20260125_schemas_get200_response_from_dict = V20260125SchemasGet200Response.from_dict(v20260125_schemas_get200_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


