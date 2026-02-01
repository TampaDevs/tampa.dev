# VPagination

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Total** | Pointer to **float32** | Total number of items (may be absent if count is expensive) | [optional] 
**Limit** | **float32** | Maximum items per page | 
**Offset** | **float32** | Number of items skipped | 
**HasMore** | **bool** | Whether more items exist beyond this page | 

## Methods

### NewVPagination

`func NewVPagination(limit float32, offset float32, hasMore bool, ) *VPagination`

NewVPagination instantiates a new VPagination object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVPaginationWithDefaults

`func NewVPaginationWithDefaults() *VPagination`

NewVPaginationWithDefaults instantiates a new VPagination object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetTotal

`func (o *VPagination) GetTotal() float32`

GetTotal returns the Total field if non-nil, zero value otherwise.

### GetTotalOk

`func (o *VPagination) GetTotalOk() (*float32, bool)`

GetTotalOk returns a tuple with the Total field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTotal

`func (o *VPagination) SetTotal(v float32)`

SetTotal sets Total field to given value.

### HasTotal

`func (o *VPagination) HasTotal() bool`

HasTotal returns a boolean if a field has been set.

### GetLimit

`func (o *VPagination) GetLimit() float32`

GetLimit returns the Limit field if non-nil, zero value otherwise.

### GetLimitOk

`func (o *VPagination) GetLimitOk() (*float32, bool)`

GetLimitOk returns a tuple with the Limit field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLimit

`func (o *VPagination) SetLimit(v float32)`

SetLimit sets Limit field to given value.


### GetOffset

`func (o *VPagination) GetOffset() float32`

GetOffset returns the Offset field if non-nil, zero value otherwise.

### GetOffsetOk

`func (o *VPagination) GetOffsetOk() (*float32, bool)`

GetOffsetOk returns a tuple with the Offset field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetOffset

`func (o *VPagination) SetOffset(v float32)`

SetOffset sets Offset field to given value.


### GetHasMore

`func (o *VPagination) GetHasMore() bool`

GetHasMore returns the HasMore field if non-nil, zero value otherwise.

### GetHasMoreOk

`func (o *VPagination) GetHasMoreOk() (*bool, bool)`

GetHasMoreOk returns a tuple with the HasMore field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHasMore

`func (o *VPagination) SetHasMore(v bool)`

SetHasMore sets HasMore field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


