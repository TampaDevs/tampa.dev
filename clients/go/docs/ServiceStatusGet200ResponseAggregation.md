# ServiceStatusGet200ResponseAggregation

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**LastRunAt** | **string** |  | 
**DurationMs** | **float32** |  | 
**GroupsProcessed** | **float32** |  | 
**GroupsFailed** | **float32** |  | 
**DataHash** | **string** |  | 
**Errors** | **[]string** |  | 

## Methods

### NewServiceStatusGet200ResponseAggregation

`func NewServiceStatusGet200ResponseAggregation(lastRunAt string, durationMs float32, groupsProcessed float32, groupsFailed float32, dataHash string, errors []string, ) *ServiceStatusGet200ResponseAggregation`

NewServiceStatusGet200ResponseAggregation instantiates a new ServiceStatusGet200ResponseAggregation object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewServiceStatusGet200ResponseAggregationWithDefaults

`func NewServiceStatusGet200ResponseAggregationWithDefaults() *ServiceStatusGet200ResponseAggregation`

NewServiceStatusGet200ResponseAggregationWithDefaults instantiates a new ServiceStatusGet200ResponseAggregation object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetLastRunAt

`func (o *ServiceStatusGet200ResponseAggregation) GetLastRunAt() string`

GetLastRunAt returns the LastRunAt field if non-nil, zero value otherwise.

### GetLastRunAtOk

`func (o *ServiceStatusGet200ResponseAggregation) GetLastRunAtOk() (*string, bool)`

GetLastRunAtOk returns a tuple with the LastRunAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLastRunAt

`func (o *ServiceStatusGet200ResponseAggregation) SetLastRunAt(v string)`

SetLastRunAt sets LastRunAt field to given value.


### GetDurationMs

`func (o *ServiceStatusGet200ResponseAggregation) GetDurationMs() float32`

GetDurationMs returns the DurationMs field if non-nil, zero value otherwise.

### GetDurationMsOk

`func (o *ServiceStatusGet200ResponseAggregation) GetDurationMsOk() (*float32, bool)`

GetDurationMsOk returns a tuple with the DurationMs field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDurationMs

`func (o *ServiceStatusGet200ResponseAggregation) SetDurationMs(v float32)`

SetDurationMs sets DurationMs field to given value.


### GetGroupsProcessed

`func (o *ServiceStatusGet200ResponseAggregation) GetGroupsProcessed() float32`

GetGroupsProcessed returns the GroupsProcessed field if non-nil, zero value otherwise.

### GetGroupsProcessedOk

`func (o *ServiceStatusGet200ResponseAggregation) GetGroupsProcessedOk() (*float32, bool)`

GetGroupsProcessedOk returns a tuple with the GroupsProcessed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroupsProcessed

`func (o *ServiceStatusGet200ResponseAggregation) SetGroupsProcessed(v float32)`

SetGroupsProcessed sets GroupsProcessed field to given value.


### GetGroupsFailed

`func (o *ServiceStatusGet200ResponseAggregation) GetGroupsFailed() float32`

GetGroupsFailed returns the GroupsFailed field if non-nil, zero value otherwise.

### GetGroupsFailedOk

`func (o *ServiceStatusGet200ResponseAggregation) GetGroupsFailedOk() (*float32, bool)`

GetGroupsFailedOk returns a tuple with the GroupsFailed field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroupsFailed

`func (o *ServiceStatusGet200ResponseAggregation) SetGroupsFailed(v float32)`

SetGroupsFailed sets GroupsFailed field to given value.


### GetDataHash

`func (o *ServiceStatusGet200ResponseAggregation) GetDataHash() string`

GetDataHash returns the DataHash field if non-nil, zero value otherwise.

### GetDataHashOk

`func (o *ServiceStatusGet200ResponseAggregation) GetDataHashOk() (*string, bool)`

GetDataHashOk returns a tuple with the DataHash field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDataHash

`func (o *ServiceStatusGet200ResponseAggregation) SetDataHash(v string)`

SetDataHash sets DataHash field to given value.


### GetErrors

`func (o *ServiceStatusGet200ResponseAggregation) GetErrors() []string`

GetErrors returns the Errors field if non-nil, zero value otherwise.

### GetErrorsOk

`func (o *ServiceStatusGet200ResponseAggregation) GetErrorsOk() (*[]string, bool)`

GetErrorsOk returns a tuple with the Errors field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetErrors

`func (o *ServiceStatusGet200ResponseAggregation) SetErrors(v []string)`

SetErrors sets Errors field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


