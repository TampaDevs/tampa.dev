# VClaimInfo

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Badge** | [**VVClaimInfoBadge**](VClaimInfoBadge.md) |  | 
**Group** | [**VVClaimInfoGroup**](VClaimInfoGroup.md) |  | 
**Claimable** | **bool** |  | 
**Reason** | Pointer to **string** |  | [optional] 

## Methods

### NewVClaimInfo

`func NewVClaimInfo(badge VVClaimInfoBadge, group VVClaimInfoGroup, claimable bool, ) *VClaimInfo`

NewVClaimInfo instantiates a new VClaimInfo object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVClaimInfoWithDefaults

`func NewVClaimInfoWithDefaults() *VClaimInfo`

NewVClaimInfoWithDefaults instantiates a new VClaimInfo object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetBadge

`func (o *VClaimInfo) GetBadge() VVClaimInfoBadge`

GetBadge returns the Badge field if non-nil, zero value otherwise.

### GetBadgeOk

`func (o *VClaimInfo) GetBadgeOk() (*VVClaimInfoBadge, bool)`

GetBadgeOk returns a tuple with the Badge field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBadge

`func (o *VClaimInfo) SetBadge(v VVClaimInfoBadge)`

SetBadge sets Badge field to given value.


### GetGroup

`func (o *VClaimInfo) GetGroup() VVClaimInfoGroup`

GetGroup returns the Group field if non-nil, zero value otherwise.

### GetGroupOk

`func (o *VClaimInfo) GetGroupOk() (*VVClaimInfoGroup, bool)`

GetGroupOk returns a tuple with the Group field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroup

`func (o *VClaimInfo) SetGroup(v VVClaimInfoGroup)`

SetGroup sets Group field to given value.


### GetClaimable

`func (o *VClaimInfo) GetClaimable() bool`

GetClaimable returns the Claimable field if non-nil, zero value otherwise.

### GetClaimableOk

`func (o *VClaimInfo) GetClaimableOk() (*bool, bool)`

GetClaimableOk returns a tuple with the Claimable field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetClaimable

`func (o *VClaimInfo) SetClaimable(v bool)`

SetClaimable sets Claimable field to given value.


### GetReason

`func (o *VClaimInfo) GetReason() string`

GetReason returns the Reason field if non-nil, zero value otherwise.

### GetReasonOk

`func (o *VClaimInfo) GetReasonOk() (*string, bool)`

GetReasonOk returns a tuple with the Reason field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetReason

`func (o *VClaimInfo) SetReason(v string)`

SetReason sets Reason field to given value.

### HasReason

`func (o *VClaimInfo) HasReason() bool`

HasReason returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


