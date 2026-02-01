# VUserProfile

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Name** | **string** |  | 
**Username** | **string** |  | 
**AvatarUrl** | **string** |  | 
**HeroImageUrl** | **string** |  | 
**ThemeColor** | **string** |  | 
**Bio** | **string** |  | 
**Location** | **string** |  | 
**SocialLinks** | **[]string** |  | 
**Role** | **string** |  | 
**ProfileVisibility** | **string** |  | 
**ShowAchievements** | **bool** |  | 
**CreatedAt** | **string** |  | 
**Email** | Pointer to **string** |  | [optional] 

## Methods

### NewVUserProfile

`func NewVUserProfile(id string, name string, username string, avatarUrl string, heroImageUrl string, themeColor string, bio string, location string, socialLinks []string, role string, profileVisibility string, showAchievements bool, createdAt string, ) *VUserProfile`

NewVUserProfile instantiates a new VUserProfile object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVUserProfileWithDefaults

`func NewVUserProfileWithDefaults() *VUserProfile`

NewVUserProfileWithDefaults instantiates a new VUserProfile object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *VUserProfile) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *VUserProfile) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *VUserProfile) SetId(v string)`

SetId sets Id field to given value.


### GetName

`func (o *VUserProfile) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *VUserProfile) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *VUserProfile) SetName(v string)`

SetName sets Name field to given value.


### GetUsername

`func (o *VUserProfile) GetUsername() string`

GetUsername returns the Username field if non-nil, zero value otherwise.

### GetUsernameOk

`func (o *VUserProfile) GetUsernameOk() (*string, bool)`

GetUsernameOk returns a tuple with the Username field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUsername

`func (o *VUserProfile) SetUsername(v string)`

SetUsername sets Username field to given value.


### GetAvatarUrl

`func (o *VUserProfile) GetAvatarUrl() string`

GetAvatarUrl returns the AvatarUrl field if non-nil, zero value otherwise.

### GetAvatarUrlOk

`func (o *VUserProfile) GetAvatarUrlOk() (*string, bool)`

GetAvatarUrlOk returns a tuple with the AvatarUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAvatarUrl

`func (o *VUserProfile) SetAvatarUrl(v string)`

SetAvatarUrl sets AvatarUrl field to given value.


### GetHeroImageUrl

`func (o *VUserProfile) GetHeroImageUrl() string`

GetHeroImageUrl returns the HeroImageUrl field if non-nil, zero value otherwise.

### GetHeroImageUrlOk

`func (o *VUserProfile) GetHeroImageUrlOk() (*string, bool)`

GetHeroImageUrlOk returns a tuple with the HeroImageUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetHeroImageUrl

`func (o *VUserProfile) SetHeroImageUrl(v string)`

SetHeroImageUrl sets HeroImageUrl field to given value.


### GetThemeColor

`func (o *VUserProfile) GetThemeColor() string`

GetThemeColor returns the ThemeColor field if non-nil, zero value otherwise.

### GetThemeColorOk

`func (o *VUserProfile) GetThemeColorOk() (*string, bool)`

GetThemeColorOk returns a tuple with the ThemeColor field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetThemeColor

`func (o *VUserProfile) SetThemeColor(v string)`

SetThemeColor sets ThemeColor field to given value.


### GetBio

`func (o *VUserProfile) GetBio() string`

GetBio returns the Bio field if non-nil, zero value otherwise.

### GetBioOk

`func (o *VUserProfile) GetBioOk() (*string, bool)`

GetBioOk returns a tuple with the Bio field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetBio

`func (o *VUserProfile) SetBio(v string)`

SetBio sets Bio field to given value.


### GetLocation

`func (o *VUserProfile) GetLocation() string`

GetLocation returns the Location field if non-nil, zero value otherwise.

### GetLocationOk

`func (o *VUserProfile) GetLocationOk() (*string, bool)`

GetLocationOk returns a tuple with the Location field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLocation

`func (o *VUserProfile) SetLocation(v string)`

SetLocation sets Location field to given value.


### GetSocialLinks

`func (o *VUserProfile) GetSocialLinks() []string`

GetSocialLinks returns the SocialLinks field if non-nil, zero value otherwise.

### GetSocialLinksOk

`func (o *VUserProfile) GetSocialLinksOk() (*[]string, bool)`

GetSocialLinksOk returns a tuple with the SocialLinks field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSocialLinks

`func (o *VUserProfile) SetSocialLinks(v []string)`

SetSocialLinks sets SocialLinks field to given value.


### GetRole

`func (o *VUserProfile) GetRole() string`

GetRole returns the Role field if non-nil, zero value otherwise.

### GetRoleOk

`func (o *VUserProfile) GetRoleOk() (*string, bool)`

GetRoleOk returns a tuple with the Role field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRole

`func (o *VUserProfile) SetRole(v string)`

SetRole sets Role field to given value.


### GetProfileVisibility

`func (o *VUserProfile) GetProfileVisibility() string`

GetProfileVisibility returns the ProfileVisibility field if non-nil, zero value otherwise.

### GetProfileVisibilityOk

`func (o *VUserProfile) GetProfileVisibilityOk() (*string, bool)`

GetProfileVisibilityOk returns a tuple with the ProfileVisibility field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetProfileVisibility

`func (o *VUserProfile) SetProfileVisibility(v string)`

SetProfileVisibility sets ProfileVisibility field to given value.


### GetShowAchievements

`func (o *VUserProfile) GetShowAchievements() bool`

GetShowAchievements returns the ShowAchievements field if non-nil, zero value otherwise.

### GetShowAchievementsOk

`func (o *VUserProfile) GetShowAchievementsOk() (*bool, bool)`

GetShowAchievementsOk returns a tuple with the ShowAchievements field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetShowAchievements

`func (o *VUserProfile) SetShowAchievements(v bool)`

SetShowAchievements sets ShowAchievements field to given value.


### GetCreatedAt

`func (o *VUserProfile) GetCreatedAt() string`

GetCreatedAt returns the CreatedAt field if non-nil, zero value otherwise.

### GetCreatedAtOk

`func (o *VUserProfile) GetCreatedAtOk() (*string, bool)`

GetCreatedAtOk returns a tuple with the CreatedAt field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetCreatedAt

`func (o *VUserProfile) SetCreatedAt(v string)`

SetCreatedAt sets CreatedAt field to given value.


### GetEmail

`func (o *VUserProfile) GetEmail() string`

GetEmail returns the Email field if non-nil, zero value otherwise.

### GetEmailOk

`func (o *VUserProfile) GetEmailOk() (*string, bool)`

GetEmailOk returns a tuple with the Email field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEmail

`func (o *VUserProfile) SetEmail(v string)`

SetEmail sets Email field to given value.

### HasEmail

`func (o *VUserProfile) HasEmail() bool`

HasEmail returns a boolean if a field has been set.


[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


