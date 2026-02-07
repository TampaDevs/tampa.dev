# VUserBadge

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | **string** |  | 
**Slug** | **string** |  | 
**Description** | **string** |  | 
**Icon** | **string** |  | 
**IconUrl** | **string** | URL to the high-quality emoji image, or null if unavailable | 
**Color** | **string** |  | 
**Points** | **float32** |  | 
**AwardedAt** | **string** |  | 
**Group** | [**VVUserBadgeGroup**](VUserBadgeGroup.md) |  | 
**Rarity** | [**VVUserBadgeRarity**](VUserBadgeRarity.md) |  | 

## Methods

### NewVUserBadge

`func NewVUserBadge(name string, slug string, description string, icon string, iconUrl string, color string, points float32, awardedAt string, group VVUserBadgeGroup, rarity VVUserBadgeRarity, ) *VUserBadge`

NewVUserBadge instantiates a new VUserBadge object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVUserBadgeWithDefaults

`func NewVUserBadgeWithDefaults() *VUserBadge`

NewVUserBadgeWithDefaults instantiates a new VUserBadge object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *VUserBadge) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *VUserBadge) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *VUserBadge) SetName(v string)`

SetName sets Name field to given value.


### GetSlug

`func (o *VUserBadge) GetSlug() string`

GetSlug returns the Slug field if non-nil, zero value otherwise.

### GetSlugOk

`func (o *VUserBadge) GetSlugOk() (*string, bool)`

GetSlugOk returns a tuple with the Slug field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSlug

`func (o *VUserBadge) SetSlug(v string)`

SetSlug sets Slug field to given value.


### GetDescription

`func (o *VUserBadge) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *VUserBadge) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *VUserBadge) SetDescription(v string)`

SetDescription sets Description field to given value.


### GetIcon

`func (o *VUserBadge) GetIcon() string`

GetIcon returns the Icon field if non-nil, zero value otherwise.

### GetIconOk

`func (o *VUserBadge) GetIconOk() (*string, bool)`

GetIconOk returns a tuple with the Icon field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIcon

`func (o *VUserBadge) SetIcon(v string)`

SetIcon sets Icon field to given value.


### GetIconUrl

`func (o *VUserBadge) GetIconUrl() string`

GetIconUrl returns the IconUrl field if non-nil, zero value otherwise.

### GetIconUrlOk

`func (o *VUserBadge) GetIconUrlOk() (*string, bool)`

GetIconUrlOk returns a tuple with the IconUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIconUrl

`func (o *VUserBadge) SetIconUrl(v string)`

SetIconUrl sets IconUrl field to given value.


### GetColor

`func (o *VUserBadge) GetColor() string`

GetColor returns the Color field if non-nil, zero value otherwise.

### GetColorOk

`func (o *VUserBadge) GetColorOk() (*string, bool)`

GetColorOk returns a tuple with the Color field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetColor

`func (o *VUserBadge) SetColor(v string)`

SetColor sets Color field to given value.


### GetPoints

`func (o *VUserBadge) GetPoints() float32`

GetPoints returns the Points field if non-nil, zero value otherwise.

### GetPointsOk

`func (o *VUserBadge) GetPointsOk() (*float32, bool)`

GetPointsOk returns a tuple with the Points field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPoints

`func (o *VUserBadge) SetPoints(v float32)`

SetPoints sets Points field to given value.


### GetAwardedAt

`func (o *VUserBadge) GetAwardedAt() string`

GetAwardedAt returns the AwardedAt field if non-nil, zero value otherwise.

### GetAwardedAtOk

`func (o *VUserBadge) GetAwardedAtOk() (*string, bool)`

GetAwardedAtOk returns a tuple with the AwardedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAwardedAt

`func (o *VUserBadge) SetAwardedAt(v string)`

SetAwardedAt sets AwardedAt field to given value.


### GetGroup

`func (o *VUserBadge) GetGroup() VVUserBadgeGroup`

GetGroup returns the Group field if non-nil, zero value otherwise.

### GetGroupOk

`func (o *VUserBadge) GetGroupOk() (*VVUserBadgeGroup, bool)`

GetGroupOk returns a tuple with the Group field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroup

`func (o *VUserBadge) SetGroup(v VVUserBadgeGroup)`

SetGroup sets Group field to given value.


### GetRarity

`func (o *VUserBadge) GetRarity() VVUserBadgeRarity`

GetRarity returns the Rarity field if non-nil, zero value otherwise.

### GetRarityOk

`func (o *VUserBadge) GetRarityOk() (*VVUserBadgeRarity, bool)`

GetRarityOk returns a tuple with the Rarity field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRarity

`func (o *VUserBadge) SetRarity(v VVUserBadgeRarity)`

SetRarity sets Rarity field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


