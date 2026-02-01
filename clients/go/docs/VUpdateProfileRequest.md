# VUpdateProfileRequest

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Name** | Pointer to **string** |  | [optional] 
**AvatarUrl** | Pointer to **string** |  | [optional] 
**HeroImageUrl** | Pointer to **string** |  | [optional] 
**ThemeColor** | Pointer to **string** |  | [optional] 
**Username** | Pointer to **string** |  | [optional] 
**Bio** | Pointer to **string** |  | [optional] 
**Location** | Pointer to **string** |  | [optional] 
**SocialLinks** | Pointer to **[]string** |  | [optional] 
**ShowAchievements** | Pointer to **bool** |  | [optional] 
**ProfileVisibility** | Pointer to **string** |  | [optional] 

## Methods

### NewVUpdateProfileRequest

`func NewVUpdateProfileRequest() *VUpdateProfileRequest`

NewVUpdateProfileRequest instantiates a new VUpdateProfileRequest object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVUpdateProfileRequestWithDefaults

`func NewVUpdateProfileRequestWithDefaults() *VUpdateProfileRequest`

NewVUpdateProfileRequestWithDefaults instantiates a new VUpdateProfileRequest object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetName

`func (o *VUpdateProfileRequest) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *VUpdateProfileRequest) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *VUpdateProfileRequest) SetName(v string)`

SetName sets Name field to given value.

### HasName

`func (o *VUpdateProfileRequest) HasName() bool`

HasName returns a boolean if a field has been set.

### GetAvatarUrl

`func (o *VUpdateProfileRequest) GetAvatarUrl() string`

GetAvatarUrl returns the AvatarUrl field if non-nil, zero value otherwise.

### GetAvatarUrlOk

`func (o *VUpdateProfileRequest) GetAvatarUrlOk() (*string, bool)`

GetAvatarUrlOk returns a tuple with the AvatarUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvatarUrl

`func (o *VUpdateProfileRequest) SetAvatarUrl(v string)`

SetAvatarUrl sets AvatarUrl field to given value.

### HasAvatarUrl

`func (o *VUpdateProfileRequest) HasAvatarUrl() bool`

HasAvatarUrl returns a boolean if a field has been set.

### GetHeroImageUrl

`func (o *VUpdateProfileRequest) GetHeroImageUrl() string`

GetHeroImageUrl returns the HeroImageUrl field if non-nil, zero value otherwise.

### GetHeroImageUrlOk

`func (o *VUpdateProfileRequest) GetHeroImageUrlOk() (*string, bool)`

GetHeroImageUrlOk returns a tuple with the HeroImageUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHeroImageUrl

`func (o *VUpdateProfileRequest) SetHeroImageUrl(v string)`

SetHeroImageUrl sets HeroImageUrl field to given value.

### HasHeroImageUrl

`func (o *VUpdateProfileRequest) HasHeroImageUrl() bool`

HasHeroImageUrl returns a boolean if a field has been set.

### GetThemeColor

`func (o *VUpdateProfileRequest) GetThemeColor() string`

GetThemeColor returns the ThemeColor field if non-nil, zero value otherwise.

### GetThemeColorOk

`func (o *VUpdateProfileRequest) GetThemeColorOk() (*string, bool)`

GetThemeColorOk returns a tuple with the ThemeColor field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetThemeColor

`func (o *VUpdateProfileRequest) SetThemeColor(v string)`

SetThemeColor sets ThemeColor field to given value.

### HasThemeColor

`func (o *VUpdateProfileRequest) HasThemeColor() bool`

HasThemeColor returns a boolean if a field has been set.

### GetUsername

`func (o *VUpdateProfileRequest) GetUsername() string`

GetUsername returns the Username field if non-nil, zero value otherwise.

### GetUsernameOk

`func (o *VUpdateProfileRequest) GetUsernameOk() (*string, bool)`

GetUsernameOk returns a tuple with the Username field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUsername

`func (o *VUpdateProfileRequest) SetUsername(v string)`

SetUsername sets Username field to given value.

### HasUsername

`func (o *VUpdateProfileRequest) HasUsername() bool`

HasUsername returns a boolean if a field has been set.

### GetBio

`func (o *VUpdateProfileRequest) GetBio() string`

GetBio returns the Bio field if non-nil, zero value otherwise.

### GetBioOk

`func (o *VUpdateProfileRequest) GetBioOk() (*string, bool)`

GetBioOk returns a tuple with the Bio field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBio

`func (o *VUpdateProfileRequest) SetBio(v string)`

SetBio sets Bio field to given value.

### HasBio

`func (o *VUpdateProfileRequest) HasBio() bool`

HasBio returns a boolean if a field has been set.

### GetLocation

`func (o *VUpdateProfileRequest) GetLocation() string`

GetLocation returns the Location field if non-nil, zero value otherwise.

### GetLocationOk

`func (o *VUpdateProfileRequest) GetLocationOk() (*string, bool)`

GetLocationOk returns a tuple with the Location field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLocation

`func (o *VUpdateProfileRequest) SetLocation(v string)`

SetLocation sets Location field to given value.

### HasLocation

`func (o *VUpdateProfileRequest) HasLocation() bool`

HasLocation returns a boolean if a field has been set.

### GetSocialLinks

`func (o *VUpdateProfileRequest) GetSocialLinks() []string`

GetSocialLinks returns the SocialLinks field if non-nil, zero value otherwise.

### GetSocialLinksOk

`func (o *VUpdateProfileRequest) GetSocialLinksOk() (*[]string, bool)`

GetSocialLinksOk returns a tuple with the SocialLinks field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSocialLinks

`func (o *VUpdateProfileRequest) SetSocialLinks(v []string)`

SetSocialLinks sets SocialLinks field to given value.

### HasSocialLinks

`func (o *VUpdateProfileRequest) HasSocialLinks() bool`

HasSocialLinks returns a boolean if a field has been set.

### GetShowAchievements

`func (o *VUpdateProfileRequest) GetShowAchievements() bool`

GetShowAchievements returns the ShowAchievements field if non-nil, zero value otherwise.

### GetShowAchievementsOk

`func (o *VUpdateProfileRequest) GetShowAchievementsOk() (*bool, bool)`

GetShowAchievementsOk returns a tuple with the ShowAchievements field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetShowAchievements

`func (o *VUpdateProfileRequest) SetShowAchievements(v bool)`

SetShowAchievements sets ShowAchievements field to given value.

### HasShowAchievements

`func (o *VUpdateProfileRequest) HasShowAchievements() bool`

HasShowAchievements returns a boolean if a field has been set.

### GetProfileVisibility

`func (o *VUpdateProfileRequest) GetProfileVisibility() string`

GetProfileVisibility returns the ProfileVisibility field if non-nil, zero value otherwise.

### GetProfileVisibilityOk

`func (o *VUpdateProfileRequest) GetProfileVisibilityOk() (*string, bool)`

GetProfileVisibilityOk returns a tuple with the ProfileVisibility field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProfileVisibility

`func (o *VUpdateProfileRequest) SetProfileVisibility(v string)`

SetProfileVisibility sets ProfileVisibility field to given value.

### HasProfileVisibility

`func (o *VUpdateProfileRequest) HasProfileVisibility() bool`

HasProfileVisibility returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


