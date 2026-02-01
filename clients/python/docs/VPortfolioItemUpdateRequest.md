# VPortfolioItemUpdateRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**title** | **str** |  | [optional] 
**description** | **str** |  | [optional] 
**url** | **str** |  | [optional] 
**image_url** | **str** |  | [optional] 
**sort_order** | **int** |  | [optional] [default to 0]

## Example

```python
from tampa_events_api.models.v_portfolio_item_update_request import VPortfolioItemUpdateRequest

# TODO update the JSON string below
json = "{}"
# create an instance of VPortfolioItemUpdateRequest from a JSON string
v_portfolio_item_update_request_instance = VPortfolioItemUpdateRequest.from_json(json)
# print the JSON string representation of the object
print(VPortfolioItemUpdateRequest.to_json())

# convert the object into a dict
v_portfolio_item_update_request_dict = v_portfolio_item_update_request_instance.to_dict()
# create an instance of VPortfolioItemUpdateRequest from a dict
v_portfolio_item_update_request_from_dict = VPortfolioItemUpdateRequest.from_dict(v_portfolio_item_update_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


