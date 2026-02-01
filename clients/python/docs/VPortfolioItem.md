# VPortfolioItem


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **str** |  | 
**user_id** | **str** |  | 
**title** | **str** |  | 
**description** | **str** |  | 
**url** | **str** |  | 
**image_url** | **str** |  | 
**sort_order** | **float** |  | 
**created_at** | **str** |  | 

## Example

```python
from tampa_events_api.models.v_portfolio_item import VPortfolioItem

# TODO update the JSON string below
json = "{}"
# create an instance of VPortfolioItem from a JSON string
v_portfolio_item_instance = VPortfolioItem.from_json(json)
# print the JSON string representation of the object
print(VPortfolioItem.to_json())

# convert the object into a dict
v_portfolio_item_dict = v_portfolio_item_instance.to_dict()
# create an instance of VPortfolioItem from a dict
v_portfolio_item_from_dict = VPortfolioItem.from_dict(v_portfolio_item_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


