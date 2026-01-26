# ServiceStatusGet200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Platforms** | [**[]ServiceStatusGet200ResponsePlatformsInner**](ServiceStatusGet200ResponsePlatformsInner.md) |  | 
**Groups** | [**[]ServiceStatusGet200ResponseGroupsInner**](ServiceStatusGet200ResponseGroupsInner.md) |  | 
**TotalGroups** | **float32** |  | 
**Aggregation** | [**ServiceStatusGet200ResponseAggregation**](ServiceStatusGet200ResponseAggregation.md) |  | 

## Methods

### NewServiceStatusGet200Response

`func NewServiceStatusGet200Response(platforms []ServiceStatusGet200ResponsePlatformsInner, groups []ServiceStatusGet200ResponseGroupsInner, totalGroups float32, aggregation ServiceStatusGet200ResponseAggregation, ) *ServiceStatusGet200Response`

NewServiceStatusGet200Response instantiates a new ServiceStatusGet200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewServiceStatusGet200ResponseWithDefaults

`func NewServiceStatusGet200ResponseWithDefaults() *ServiceStatusGet200Response`

NewServiceStatusGet200ResponseWithDefaults instantiates a new ServiceStatusGet200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetPlatforms

`func (o *ServiceStatusGet200Response) GetPlatforms() []ServiceStatusGet200ResponsePlatformsInner`

GetPlatforms returns the Platforms field if non-nil, zero value otherwise.

### GetPlatformsOk

`func (o *ServiceStatusGet200Response) GetPlatformsOk() (*[]ServiceStatusGet200ResponsePlatformsInner, bool)`

GetPlatformsOk returns a tuple with the Platforms field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPlatforms

`func (o *ServiceStatusGet200Response) SetPlatforms(v []ServiceStatusGet200ResponsePlatformsInner)`

SetPlatforms sets Platforms field to given value.


### GetGroups

`func (o *ServiceStatusGet200Response) GetGroups() []ServiceStatusGet200ResponseGroupsInner`

GetGroups returns the Groups field if non-nil, zero value otherwise.

### GetGroupsOk

`func (o *ServiceStatusGet200Response) GetGroupsOk() (*[]ServiceStatusGet200ResponseGroupsInner, bool)`

GetGroupsOk returns a tuple with the Groups field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroups

`func (o *ServiceStatusGet200Response) SetGroups(v []ServiceStatusGet200ResponseGroupsInner)`

SetGroups sets Groups field to given value.


### GetTotalGroups

`func (o *ServiceStatusGet200Response) GetTotalGroups() float32`

GetTotalGroups returns the TotalGroups field if non-nil, zero value otherwise.

### GetTotalGroupsOk

`func (o *ServiceStatusGet200Response) GetTotalGroupsOk() (*float32, bool)`

GetTotalGroupsOk returns a tuple with the TotalGroups field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTotalGroups

`func (o *ServiceStatusGet200Response) SetTotalGroups(v float32)`

SetTotalGroups sets TotalGroups field to given value.


### GetAggregation

`func (o *ServiceStatusGet200Response) GetAggregation() ServiceStatusGet200ResponseAggregation`

GetAggregation returns the Aggregation field if non-nil, zero value otherwise.

### GetAggregationOk

`func (o *ServiceStatusGet200Response) GetAggregationOk() (*ServiceStatusGet200ResponseAggregation, bool)`

GetAggregationOk returns a tuple with the Aggregation field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAggregation

`func (o *ServiceStatusGet200Response) SetAggregation(v ServiceStatusGet200ResponseAggregation)`

SetAggregation sets Aggregation field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


