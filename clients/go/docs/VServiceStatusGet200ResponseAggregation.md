# VServiceStatusGet200ResponseAggregation

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**LastRunAt** | Pointer to **string** |  | [optional] 
**DurationMs** | Pointer to **float32** |  | [optional] 
**GroupsProcessed** | Pointer to **float32** |  | [optional] 
**GroupsFailed** | Pointer to **float32** |  | [optional] 
**DataHash** | Pointer to **string** |  | [optional] 
**Errors** | **[]string** |  | 

## Methods

### NewVServiceStatusGet200ResponseAggregation

`func NewVServiceStatusGet200ResponseAggregation(errors []string, ) *VServiceStatusGet200ResponseAggregation`

NewVServiceStatusGet200ResponseAggregation instantiates a new VServiceStatusGet200ResponseAggregation object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVServiceStatusGet200ResponseAggregationWithDefaults

`func NewVServiceStatusGet200ResponseAggregationWithDefaults() *VServiceStatusGet200ResponseAggregation`

NewVServiceStatusGet200ResponseAggregationWithDefaults instantiates a new VServiceStatusGet200ResponseAggregation object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetLastRunAt

`func (o *VServiceStatusGet200ResponseAggregation) GetLastRunAt() string`

GetLastRunAt returns the LastRunAt field if non-nil, zero value otherwise.

### GetLastRunAtOk

`func (o *VServiceStatusGet200ResponseAggregation) GetLastRunAtOk() (*string, bool)`

GetLastRunAtOk returns a tuple with the LastRunAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastRunAt

`func (o *VServiceStatusGet200ResponseAggregation) SetLastRunAt(v string)`

SetLastRunAt sets LastRunAt field to given value.

### HasLastRunAt

`func (o *VServiceStatusGet200ResponseAggregation) HasLastRunAt() bool`

HasLastRunAt returns a boolean if a field has been set.

### GetDurationMs

`func (o *VServiceStatusGet200ResponseAggregation) GetDurationMs() float32`

GetDurationMs returns the DurationMs field if non-nil, zero value otherwise.

### GetDurationMsOk

`func (o *VServiceStatusGet200ResponseAggregation) GetDurationMsOk() (*float32, bool)`

GetDurationMsOk returns a tuple with the DurationMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDurationMs

`func (o *VServiceStatusGet200ResponseAggregation) SetDurationMs(v float32)`

SetDurationMs sets DurationMs field to given value.

### HasDurationMs

`func (o *VServiceStatusGet200ResponseAggregation) HasDurationMs() bool`

HasDurationMs returns a boolean if a field has been set.

### GetGroupsProcessed

`func (o *VServiceStatusGet200ResponseAggregation) GetGroupsProcessed() float32`

GetGroupsProcessed returns the GroupsProcessed field if non-nil, zero value otherwise.

### GetGroupsProcessedOk

`func (o *VServiceStatusGet200ResponseAggregation) GetGroupsProcessedOk() (*float32, bool)`

GetGroupsProcessedOk returns a tuple with the GroupsProcessed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroupsProcessed

`func (o *VServiceStatusGet200ResponseAggregation) SetGroupsProcessed(v float32)`

SetGroupsProcessed sets GroupsProcessed field to given value.

### HasGroupsProcessed

`func (o *VServiceStatusGet200ResponseAggregation) HasGroupsProcessed() bool`

HasGroupsProcessed returns a boolean if a field has been set.

### GetGroupsFailed

`func (o *VServiceStatusGet200ResponseAggregation) GetGroupsFailed() float32`

GetGroupsFailed returns the GroupsFailed field if non-nil, zero value otherwise.

### GetGroupsFailedOk

`func (o *VServiceStatusGet200ResponseAggregation) GetGroupsFailedOk() (*float32, bool)`

GetGroupsFailedOk returns a tuple with the GroupsFailed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroupsFailed

`func (o *VServiceStatusGet200ResponseAggregation) SetGroupsFailed(v float32)`

SetGroupsFailed sets GroupsFailed field to given value.

### HasGroupsFailed

`func (o *VServiceStatusGet200ResponseAggregation) HasGroupsFailed() bool`

HasGroupsFailed returns a boolean if a field has been set.

### GetDataHash

`func (o *VServiceStatusGet200ResponseAggregation) GetDataHash() string`

GetDataHash returns the DataHash field if non-nil, zero value otherwise.

### GetDataHashOk

`func (o *VServiceStatusGet200ResponseAggregation) GetDataHashOk() (*string, bool)`

GetDataHashOk returns a tuple with the DataHash field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDataHash

`func (o *VServiceStatusGet200ResponseAggregation) SetDataHash(v string)`

SetDataHash sets DataHash field to given value.

### HasDataHash

`func (o *VServiceStatusGet200ResponseAggregation) HasDataHash() bool`

HasDataHash returns a boolean if a field has been set.

### GetErrors

`func (o *VServiceStatusGet200ResponseAggregation) GetErrors() []string`

GetErrors returns the Errors field if non-nil, zero value otherwise.

### GetErrorsOk

`func (o *VServiceStatusGet200ResponseAggregation) GetErrorsOk() (*[]string, bool)`

GetErrorsOk returns a tuple with the Errors field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetErrors

`func (o *VServiceStatusGet200ResponseAggregation) SetErrors(v []string)`

SetErrors sets Errors field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


