# VV1UsersUsernameFollowersGet200Response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Data** | [**[]VVFollowEntry**](VVFollowEntry.md) |  | 
**Pagination** | [**VVPagination**](VPagination.md) |  | 

## Methods

### NewVV1UsersUsernameFollowersGet200Response

`func NewVV1UsersUsernameFollowersGet200Response(data []VVFollowEntry, pagination VVPagination, ) *VV1UsersUsernameFollowersGet200Response`

NewVV1UsersUsernameFollowersGet200Response instantiates a new VV1UsersUsernameFollowersGet200Response object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVV1UsersUsernameFollowersGet200ResponseWithDefaults

`func NewVV1UsersUsernameFollowersGet200ResponseWithDefaults() *VV1UsersUsernameFollowersGet200Response`

NewVV1UsersUsernameFollowersGet200ResponseWithDefaults instantiates a new VV1UsersUsernameFollowersGet200Response object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetData

`func (o *VV1UsersUsernameFollowersGet200Response) GetData() []VVFollowEntry`

GetData returns the Data field if non-nil, zero value otherwise.

### GetDataOk

`func (o *VV1UsersUsernameFollowersGet200Response) GetDataOk() (*[]VVFollowEntry, bool)`

GetDataOk returns a tuple with the Data field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetData

`func (o *VV1UsersUsernameFollowersGet200Response) SetData(v []VVFollowEntry)`

SetData sets Data field to given value.


### GetPagination

`func (o *VV1UsersUsernameFollowersGet200Response) GetPagination() VVPagination`

GetPagination returns the Pagination field if non-nil, zero value otherwise.

### GetPaginationOk

`func (o *VV1UsersUsernameFollowersGet200Response) GetPaginationOk() (*VVPagination, bool)`

GetPaginationOk returns a tuple with the Pagination field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPagination

`func (o *VV1UsersUsernameFollowersGet200Response) SetPagination(v VVPagination)`

SetPagination sets Pagination field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


