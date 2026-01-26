# VServiceStatusGet200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Platforms** | [**[]VVServiceStatusGet200ResponsePlatformsInner**](VVServiceStatusGet200ResponsePlatformsInner.md) |  | 
**Groups** | [**[]VVServiceStatusGet200ResponseGroupsInner**](VVServiceStatusGet200ResponseGroupsInner.md) |  | 
**TotalGroups** | **float32** |  | 
**Aggregation** | [**VVServiceStatusGet200ResponseAggregation**](VServiceStatusGet200ResponseAggregation.md) |  | 

## Methods

### NewVServiceStatusGet200Response

`func NewVServiceStatusGet200Response(platforms []VVServiceStatusGet200ResponsePlatformsInner, groups []VVServiceStatusGet200ResponseGroupsInner, totalGroups float32, aggregation VVServiceStatusGet200ResponseAggregation, ) *VServiceStatusGet200Response`

NewVServiceStatusGet200Response instantiates a new VServiceStatusGet200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVServiceStatusGet200ResponseWithDefaults

`func NewVServiceStatusGet200ResponseWithDefaults() *VServiceStatusGet200Response`

NewVServiceStatusGet200ResponseWithDefaults instantiates a new VServiceStatusGet200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetPlatforms

`func (o *VServiceStatusGet200Response) GetPlatforms() []VVServiceStatusGet200ResponsePlatformsInner`

GetPlatforms returns the Platforms field if non-nil, zero value otherwise.

### GetPlatformsOk

`func (o *VServiceStatusGet200Response) GetPlatformsOk() (*[]VVServiceStatusGet200ResponsePlatformsInner, bool)`

GetPlatformsOk returns a tuple with the Platforms field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatforms

`func (o *VServiceStatusGet200Response) SetPlatforms(v []VVServiceStatusGet200ResponsePlatformsInner)`

SetPlatforms sets Platforms field to given value.


### GetGroups

`func (o *VServiceStatusGet200Response) GetGroups() []VVServiceStatusGet200ResponseGroupsInner`

GetGroups returns the Groups field if non-nil, zero value otherwise.

### GetGroupsOk

`func (o *VServiceStatusGet200Response) GetGroupsOk() (*[]VVServiceStatusGet200ResponseGroupsInner, bool)`

GetGroupsOk returns a tuple with the Groups field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroups

`func (o *VServiceStatusGet200Response) SetGroups(v []VVServiceStatusGet200ResponseGroupsInner)`

SetGroups sets Groups field to given value.


### GetTotalGroups

`func (o *VServiceStatusGet200Response) GetTotalGroups() float32`

GetTotalGroups returns the TotalGroups field if non-nil, zero value otherwise.

### GetTotalGroupsOk

`func (o *VServiceStatusGet200Response) GetTotalGroupsOk() (*float32, bool)`

GetTotalGroupsOk returns a tuple with the TotalGroups field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTotalGroups

`func (o *VServiceStatusGet200Response) SetTotalGroups(v float32)`

SetTotalGroups sets TotalGroups field to given value.


### GetAggregation

`func (o *VServiceStatusGet200Response) GetAggregation() VVServiceStatusGet200ResponseAggregation`

GetAggregation returns the Aggregation field if non-nil, zero value otherwise.

### GetAggregationOk

`func (o *VServiceStatusGet200Response) GetAggregationOk() (*VVServiceStatusGet200ResponseAggregation, bool)`

GetAggregationOk returns a tuple with the Aggregation field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAggregation

`func (o *VServiceStatusGet200Response) SetAggregation(v VVServiceStatusGet200ResponseAggregation)`

SetAggregation sets Aggregation field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


