# VScope

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | **string** |  | 
**Description** | **string** |  | 
**Implies** | **[]string** |  | 

## Methods

### NewVScope

`func NewVScope(name string, description string, implies []string, ) *VScope`

NewVScope instantiates a new VScope object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVScopeWithDefaults

`func NewVScopeWithDefaults() *VScope`

NewVScopeWithDefaults instantiates a new VScope object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *VScope) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *VScope) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *VScope) SetName(v string)`

SetName sets Name field to given value.


### GetDescription

`func (o *VScope) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *VScope) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *VScope) SetDescription(v string)`

SetDescription sets Description field to given value.


### GetImplies

`func (o *VScope) GetImplies() []string`

GetImplies returns the Implies field if non-nil, zero value otherwise.

### GetImpliesOk

`func (o *VScope) GetImpliesOk() (*[]string, bool)`

GetImpliesOk returns a tuple with the Implies field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetImplies

`func (o *VScope) SetImplies(v []string)`

SetImplies sets Implies field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


