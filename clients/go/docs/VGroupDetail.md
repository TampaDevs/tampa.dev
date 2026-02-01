# VGroupDetail

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
**UpcomingEvents** | [**[]VVGroupDetailAllOfUpcomingEvents**](VVGroupDetailAllOfUpcomingEvents.md) |  | 

## Methods

### NewVGroupDetail

`func NewVGroupDetail(id string, urlname string, name string, description string, link string, website string, memberCount float32, photoUrl string, upcomingEvents []VVGroupDetailAllOfUpcomingEvents, ) *VGroupDetail`

NewVGroupDetail instantiates a new VGroupDetail object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVGroupDetailWithDefaults

`func NewVGroupDetailWithDefaults() *VGroupDetail`

NewVGroupDetailWithDefaults instantiates a new VGroupDetail object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *VGroupDetail) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *VGroupDetail) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *VGroupDetail) SetId(v string)`

SetId sets Id field to given value.


### GetUrlname

`func (o *VGroupDetail) GetUrlname() string`

GetUrlname returns the Urlname field if non-nil, zero value otherwise.

### GetUrlnameOk

`func (o *VGroupDetail) GetUrlnameOk() (*string, bool)`

GetUrlnameOk returns a tuple with the Urlname field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUrlname

`func (o *VGroupDetail) SetUrlname(v string)`

SetUrlname sets Urlname field to given value.


### GetName

`func (o *VGroupDetail) GetName() string`

GetName returns the Name field if non-nil, zero value otherwise.

### GetNameOk

`func (o *VGroupDetail) GetNameOk() (*string, bool)`

GetNameOk returns a tuple with the Name field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetName

`func (o *VGroupDetail) SetName(v string)`

SetName sets Name field to given value.


### GetDescription

`func (o *VGroupDetail) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *VGroupDetail) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *VGroupDetail) SetDescription(v string)`

SetDescription sets Description field to given value.


### GetLink

`func (o *VGroupDetail) GetLink() string`

GetLink returns the Link field if non-nil, zero value otherwise.

### GetLinkOk

`func (o *VGroupDetail) GetLinkOk() (*string, bool)`

GetLinkOk returns a tuple with the Link field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetLink

`func (o *VGroupDetail) SetLink(v string)`

SetLink sets Link field to given value.


### GetWebsite

`func (o *VGroupDetail) GetWebsite() string`

GetWebsite returns the Website field if non-nil, zero value otherwise.

### GetWebsiteOk

`func (o *VGroupDetail) GetWebsiteOk() (*string, bool)`

GetWebsiteOk returns a tuple with the Website field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetWebsite

`func (o *VGroupDetail) SetWebsite(v string)`

SetWebsite sets Website field to given value.


### GetMemberCount

`func (o *VGroupDetail) GetMemberCount() float32`

GetMemberCount returns the MemberCount field if non-nil, zero value otherwise.

### GetMemberCountOk

`func (o *VGroupDetail) GetMemberCountOk() (*float32, bool)`

GetMemberCountOk returns a tuple with the MemberCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMemberCount

`func (o *VGroupDetail) SetMemberCount(v float32)`

SetMemberCount sets MemberCount field to given value.


### GetPhotoUrl

`func (o *VGroupDetail) GetPhotoUrl() string`

GetPhotoUrl returns the PhotoUrl field if non-nil, zero value otherwise.

### GetPhotoUrlOk

`func (o *VGroupDetail) GetPhotoUrlOk() (*string, bool)`

GetPhotoUrlOk returns a tuple with the PhotoUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPhotoUrl

`func (o *VGroupDetail) SetPhotoUrl(v string)`

SetPhotoUrl sets PhotoUrl field to given value.


### GetTags

`func (o *VGroupDetail) GetTags() interface{}`

GetTags returns the Tags field if non-nil, zero value otherwise.

### GetTagsOk

`func (o *VGroupDetail) GetTagsOk() (*interface{}, bool)`

GetTagsOk returns a tuple with the Tags field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTags

`func (o *VGroupDetail) SetTags(v interface{})`

SetTags sets Tags field to given value.

### HasTags

`func (o *VGroupDetail) HasTags() bool`

HasTags returns a boolean if a field has been set.

### SetTagsNil

`func (o *VGroupDetail) SetTagsNil(b bool)`

 SetTagsNil sets the value for Tags to be an explicit nil

### UnsetTags
`func (o *VGroupDetail) UnsetTags()`

UnsetTags ensures that no value is present for Tags, not even an explicit nil
### GetSocialLinks

`func (o *VGroupDetail) GetSocialLinks() interface{}`

GetSocialLinks returns the SocialLinks field if non-nil, zero value otherwise.

### GetSocialLinksOk

`func (o *VGroupDetail) GetSocialLinksOk() (*interface{}, bool)`

GetSocialLinksOk returns a tuple with the SocialLinks field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetSocialLinks

`func (o *VGroupDetail) SetSocialLinks(v interface{})`

SetSocialLinks sets SocialLinks field to given value.

### HasSocialLinks

`func (o *VGroupDetail) HasSocialLinks() bool`

HasSocialLinks returns a boolean if a field has been set.

### SetSocialLinksNil

`func (o *VGroupDetail) SetSocialLinksNil(b bool)`

 SetSocialLinksNil sets the value for SocialLinks to be an explicit nil

### UnsetSocialLinks
`func (o *VGroupDetail) UnsetSocialLinks()`

UnsetSocialLinks ensures that no value is present for SocialLinks, not even an explicit nil
### GetUpcomingEvents

`func (o *VGroupDetail) GetUpcomingEvents() []VVGroupDetailAllOfUpcomingEvents`

GetUpcomingEvents returns the UpcomingEvents field if non-nil, zero value otherwise.

### GetUpcomingEventsOk

`func (o *VGroupDetail) GetUpcomingEventsOk() (*[]VVGroupDetailAllOfUpcomingEvents, bool)`

GetUpcomingEventsOk returns a tuple with the UpcomingEvents field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetUpcomingEvents

`func (o *VGroupDetail) SetUpcomingEvents(v []VVGroupDetailAllOfUpcomingEvents)`

SetUpcomingEvents sets UpcomingEvents field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


