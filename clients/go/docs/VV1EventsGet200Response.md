# VV1EventsGet200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Data** | [**[]VVEventListItem**](VVEventListItem.md) |  | 
**Pagination** | [**VVPagination**](VPagination.md) |  | 

## Methods

### NewVV1EventsGet200Response

`func NewVV1EventsGet200Response(data []VVEventListItem, pagination VVPagination, ) *VV1EventsGet200Response`

NewVV1EventsGet200Response instantiates a new VV1EventsGet200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVV1EventsGet200ResponseWithDefaults

`func NewVV1EventsGet200ResponseWithDefaults() *VV1EventsGet200Response`

NewVV1EventsGet200ResponseWithDefaults instantiates a new VV1EventsGet200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetData

`func (o *VV1EventsGet200Response) GetData() []VVEventListItem`

GetData returns the Data field if non-nil, zero value otherwise.

### GetDataOk

`func (o *VV1EventsGet200Response) GetDataOk() (*[]VVEventListItem, bool)`

GetDataOk returns a tuple with the Data field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetData

`func (o *VV1EventsGet200Response) SetData(v []VVEventListItem)`

SetData sets Data field to given value.


### GetPagination

`func (o *VV1EventsGet200Response) GetPagination() VVPagination`

GetPagination returns the Pagination field if non-nil, zero value otherwise.

### GetPaginationOk

`func (o *VV1EventsGet200Response) GetPaginationOk() (*VVPagination, bool)`

GetPaginationOk returns a tuple with the Pagination field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPagination

`func (o *VV1EventsGet200Response) SetPagination(v VVPagination)`

SetPagination sets Pagination field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


