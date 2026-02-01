# VGroupListItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Urlname** | **string** |  | 
**Name** | **string** |  | 
**Description** | **string** |  | 
**Link** | **string** |  | 
**Website** | **string** |  | 
**MemberCount** | **float32** |  | 
**PhotoUrl** | **string** |  | 
**Tags** | Pointer to **interface{}** |  | [optional] 
**SocialLinks** | Pointer to **interface{}** |  | [optional] 

## Methods

### NewVGroupListItem

`func NewVGroupListItem(id string, urlname string, name string, description string, link string, website string, memberCount float32, photoUrl string, ) *VGroupListItem`

NewVGroupListItem instantiates a new VGroupListItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVGroupListItemWithDefaults

`func NewVGroupListItemWithDefaults() *VGroupListItem`

NewVGroupListItemWithDefaults instantiates a new VGroupListItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *VGroupListItem) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *VGroupListItem) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *VGroupListItem) SetId(v string)`

SetId sets Id field to given value.


### GetUrlname

`func (o *VGroupListItem) GetUrlname() string`

GetUrlname returns the Urlname field if non-nil, zero value otherwise.

### GetUrlnameOk

`func (o *VGroupListItem) GetUrlnameOk() (*string, bool)`

GetUrlnameOk returns a tuple with the Urlname field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUrlname

`func (o *VGroupListItem) SetUrlname(v string)`

SetUrlname sets Urlname field to given value.


### GetName

`func (o *VGroupListItem) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *VGroupListItem) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *VGroupListItem) SetName(v string)`

SetName sets Name field to given value.


### GetDescription

`func (o *VGroupListItem) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *VGroupListItem) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *VGroupListItem) SetDescription(v string)`

SetDescription sets Description field to given value.


### GetLink

`func (o *VGroupListItem) GetLink() string`

GetLink returns the Link field if non-nil, zero value otherwise.

### GetLinkOk

`func (o *VGroupListItem) GetLinkOk() (*string, bool)`

GetLinkOk returns a tuple with the Link field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLink

`func (o *VGroupListItem) SetLink(v string)`

SetLink sets Link field to given value.


### GetWebsite

`func (o *VGroupListItem) GetWebsite() string`

GetWebsite returns the Website field if non-nil, zero value otherwise.

### GetWebsiteOk

`func (o *VGroupListItem) GetWebsiteOk() (*string, bool)`

GetWebsiteOk returns a tuple with the Website field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWebsite

`func (o *VGroupListItem) SetWebsite(v string)`

SetWebsite sets Website field to given value.


### GetMemberCount

`func (o *VGroupListItem) GetMemberCount() float32`

GetMemberCount returns the MemberCount field if non-nil, zero value otherwise.

### GetMemberCountOk

`func (o *VGroupListItem) GetMemberCountOk() (*float32, bool)`

GetMemberCountOk returns a tuple with the MemberCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemberCount

`func (o *VGroupListItem) SetMemberCount(v float32)`

SetMemberCount sets MemberCount field to given value.


### GetPhotoUrl

`func (o *VGroupListItem) GetPhotoUrl() string`

GetPhotoUrl returns the PhotoUrl field if non-nil, zero value otherwise.

### GetPhotoUrlOk

`func (o *VGroupListItem) GetPhotoUrlOk() (*string, bool)`

GetPhotoUrlOk returns a tuple with the PhotoUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPhotoUrl

`func (o *VGroupListItem) SetPhotoUrl(v string)`

SetPhotoUrl sets PhotoUrl field to given value.


### GetTags

`func (o *VGroupListItem) GetTags() interface{}`

GetTags returns the Tags field if non-nil, zero value otherwise.

### GetTagsOk

`func (o *VGroupListItem) GetTagsOk() (*interface{}, bool)`

GetTagsOk returns a tuple with the Tags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTags

`func (o *VGroupListItem) SetTags(v interface{})`

SetTags sets Tags field to given value.

### HasTags

`func (o *VGroupListItem) HasTags() bool`

HasTags returns a boolean if a field has been set.

### SetTagsNil

`func (o *VGroupListItem) SetTagsNil(b bool)`

 SetTagsNil sets the value for Tags to be an explicit nil

### UnsetTags
`func (o *VGroupListItem) UnsetTags()`

UnsetTags ensures that no value is present for Tags, not even an explicit nil
### GetSocialLinks

`func (o *VGroupListItem) GetSocialLinks() interface{}`

GetSocialLinks returns the SocialLinks field if non-nil, zero value otherwise.

### GetSocialLinksOk

`func (o *VGroupListItem) GetSocialLinksOk() (*interface{}, bool)`

GetSocialLinksOk returns a tuple with the SocialLinks field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSocialLinks

`func (o *VGroupListItem) SetSocialLinks(v interface{})`

SetSocialLinks sets SocialLinks field to given value.

### HasSocialLinks

`func (o *VGroupListItem) HasSocialLinks() bool`

HasSocialLinks returns a boolean if a field has been set.

### SetSocialLinksNil

`func (o *VGroupListItem) SetSocialLinksNil(b bool)`

 SetSocialLinksNil sets the value for SocialLinks to be an explicit nil

### UnsetSocialLinks
`func (o *VGroupListItem) UnsetSocialLinks()`

UnsetSocialLinks ensures that no value is present for SocialLinks, not even an explicit nil

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


