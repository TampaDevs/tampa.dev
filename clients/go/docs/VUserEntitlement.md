# VUserEntitlement

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Entitlement** | **string** | Entitlement key (e.g., dev.tampa.group.create) | 
**GrantedAt** | **string** | ISO timestamp when entitlement was granted | 
**ExpiresAt** | **string** | ISO timestamp when entitlement expires, or null if permanent | 
**Source** | **string** | How the entitlement was granted (e.g., admin, achievement) | 

## Methods

### NewVUserEntitlement

`func NewVUserEntitlement(id string, entitlement string, grantedAt string, expiresAt string, source string, ) *VUserEntitlement`

NewVUserEntitlement instantiates a new VUserEntitlement object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVUserEntitlementWithDefaults

`func NewVUserEntitlementWithDefaults() *VUserEntitlement`

NewVUserEntitlementWithDefaults instantiates a new VUserEntitlement object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *VUserEntitlement) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *VUserEntitlement) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *VUserEntitlement) SetId(v string)`

SetId sets Id field to given value.


### GetEntitlement

`func (o *VUserEntitlement) GetEntitlement() string`

GetEntitlement returns the Entitlement field if non-nil, zero value otherwise.

### GetEntitlementOk

`func (o *VUserEntitlement) GetEntitlementOk() (*string, bool)`

GetEntitlementOk returns a tuple with the Entitlement field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEntitlement

`func (o *VUserEntitlement) SetEntitlement(v string)`

SetEntitlement sets Entitlement field to given value.


### GetGrantedAt

`func (o *VUserEntitlement) GetGrantedAt() string`

GetGrantedAt returns the GrantedAt field if non-nil, zero value otherwise.

### GetGrantedAtOk

`func (o *VUserEntitlement) GetGrantedAtOk() (*string, bool)`

GetGrantedAtOk returns a tuple with the GrantedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGrantedAt

`func (o *VUserEntitlement) SetGrantedAt(v string)`

SetGrantedAt sets GrantedAt field to given value.


### GetExpiresAt

`func (o *VUserEntitlement) GetExpiresAt() string`

GetExpiresAt returns the ExpiresAt field if non-nil, zero value otherwise.

### GetExpiresAtOk

`func (o *VUserEntitlement) GetExpiresAtOk() (*string, bool)`

GetExpiresAtOk returns a tuple with the ExpiresAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresAt

`func (o *VUserEntitlement) SetExpiresAt(v string)`

SetExpiresAt sets ExpiresAt field to given value.


### GetSource

`func (o *VUserEntitlement) GetSource() string`

GetSource returns the Source field if non-nil, zero value otherwise.

### GetSourceOk

`func (o *VUserEntitlement) GetSourceOk() (*string, bool)`

GetSourceOk returns a tuple with the Source field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSource

`func (o *VUserEntitlement) SetSource(v string)`

SetSource sets Source field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


