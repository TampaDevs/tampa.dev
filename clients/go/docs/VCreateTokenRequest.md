# VCreateTokenRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | **string** | Human-readable name for the token | 
**Scopes** | **[]string** | OAuth scopes to grant to this token | 
**ExpiresInDays** | Pointer to **int32** | Token expiry in days (1-365, default: no expiry) | [optional] 

## Methods

### NewVCreateTokenRequest

`func NewVCreateTokenRequest(name string, scopes []string, ) *VCreateTokenRequest`

NewVCreateTokenRequest instantiates a new VCreateTokenRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVCreateTokenRequestWithDefaults

`func NewVCreateTokenRequestWithDefaults() *VCreateTokenRequest`

NewVCreateTokenRequestWithDefaults instantiates a new VCreateTokenRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *VCreateTokenRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *VCreateTokenRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *VCreateTokenRequest) SetName(v string)`

SetName sets Name field to given value.


### GetScopes

`func (o *VCreateTokenRequest) GetScopes() []string`

GetScopes returns the Scopes field if non-nil, zero value otherwise.

### GetScopesOk

`func (o *VCreateTokenRequest) GetScopesOk() (*[]string, bool)`

GetScopesOk returns a tuple with the Scopes field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetScopes

`func (o *VCreateTokenRequest) SetScopes(v []string)`

SetScopes sets Scopes field to given value.


### GetExpiresInDays

`func (o *VCreateTokenRequest) GetExpiresInDays() int32`

GetExpiresInDays returns the ExpiresInDays field if non-nil, zero value otherwise.

### GetExpiresInDaysOk

`func (o *VCreateTokenRequest) GetExpiresInDaysOk() (*int32, bool)`

GetExpiresInDaysOk returns a tuple with the ExpiresInDays field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetExpiresInDays

`func (o *VCreateTokenRequest) SetExpiresInDays(v int32)`

SetExpiresInDays sets ExpiresInDays field to given value.

### HasExpiresInDays

`func (o *VCreateTokenRequest) HasExpiresInDays() bool`

HasExpiresInDays returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


