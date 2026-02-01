# VEventListItem

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Title** | **string** |  | 
**Description** | **string** |  | 
**StartTime** | **string** |  | 
**EndTime** | **string** |  | 
**Timezone** | **string** |  | 
**EventUrl** | **string** |  | 
**PhotoUrl** | **string** |  | 
**EventType** | **string** |  | 
**RsvpCount** | **float32** |  | 
**MaxAttendees** | **float32** |  | 
**Group** | [**VVEventListItemGroup**](VEventListItemGroup.md) |  | 

## Methods

### NewVEventListItem

`func NewVEventListItem(id string, title string, description string, startTime string, endTime string, timezone string, eventUrl string, photoUrl string, eventType string, rsvpCount float32, maxAttendees float32, group VVEventListItemGroup, ) *VEventListItem`

NewVEventListItem instantiates a new VEventListItem object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewVEventListItemWithDefaults

`func NewVEventListItemWithDefaults() *VEventListItem`

NewVEventListItemWithDefaults instantiates a new VEventListItem object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *VEventListItem) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *VEventListItem) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *VEventListItem) SetId(v string)`

SetId sets Id field to given value.


### GetTitle

`func (o *VEventListItem) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *VEventListItem) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *VEventListItem) SetTitle(v string)`

SetTitle sets Title field to given value.


### GetDescription

`func (o *VEventListItem) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *VEventListItem) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *VEventListItem) SetDescription(v string)`

SetDescription sets Description field to given value.


### GetStartTime

`func (o *VEventListItem) GetStartTime() string`

GetStartTime returns the StartTime field if non-nil, zero value otherwise.

### GetStartTimeOk

`func (o *VEventListItem) GetStartTimeOk() (*string, bool)`

GetStartTimeOk returns a tuple with the StartTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStartTime

`func (o *VEventListItem) SetStartTime(v string)`

SetStartTime sets StartTime field to given value.


### GetEndTime

`func (o *VEventListItem) GetEndTime() string`

GetEndTime returns the EndTime field if non-nil, zero value otherwise.

### GetEndTimeOk

`func (o *VEventListItem) GetEndTimeOk() (*string, bool)`

GetEndTimeOk returns a tuple with the EndTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEndTime

`func (o *VEventListItem) SetEndTime(v string)`

SetEndTime sets EndTime field to given value.


### GetTimezone

`func (o *VEventListItem) GetTimezone() string`

GetTimezone returns the Timezone field if non-nil, zero value otherwise.

### GetTimezoneOk

`func (o *VEventListItem) GetTimezoneOk() (*string, bool)`

GetTimezoneOk returns a tuple with the Timezone field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTimezone

`func (o *VEventListItem) SetTimezone(v string)`

SetTimezone sets Timezone field to given value.


### GetEventUrl

`func (o *VEventListItem) GetEventUrl() string`

GetEventUrl returns the EventUrl field if non-nil, zero value otherwise.

### GetEventUrlOk

`func (o *VEventListItem) GetEventUrlOk() (*string, bool)`

GetEventUrlOk returns a tuple with the EventUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventUrl

`func (o *VEventListItem) SetEventUrl(v string)`

SetEventUrl sets EventUrl field to given value.


### GetPhotoUrl

`func (o *VEventListItem) GetPhotoUrl() string`

GetPhotoUrl returns the PhotoUrl field if non-nil, zero value otherwise.

### GetPhotoUrlOk

`func (o *VEventListItem) GetPhotoUrlOk() (*string, bool)`

GetPhotoUrlOk returns a tuple with the PhotoUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPhotoUrl

`func (o *VEventListItem) SetPhotoUrl(v string)`

SetPhotoUrl sets PhotoUrl field to given value.


### GetEventType

`func (o *VEventListItem) GetEventType() string`

GetEventType returns the EventType field if non-nil, zero value otherwise.

### GetEventTypeOk

`func (o *VEventListItem) GetEventTypeOk() (*string, bool)`

GetEventTypeOk returns a tuple with the EventType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventType

`func (o *VEventListItem) SetEventType(v string)`

SetEventType sets EventType field to given value.


### GetRsvpCount

`func (o *VEventListItem) GetRsvpCount() float32`

GetRsvpCount returns the RsvpCount field if non-nil, zero value otherwise.

### GetRsvpCountOk

`func (o *VEventListItem) GetRsvpCountOk() (*float32, bool)`

GetRsvpCountOk returns a tuple with the RsvpCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRsvpCount

`func (o *VEventListItem) SetRsvpCount(v float32)`

SetRsvpCount sets RsvpCount field to given value.


### GetMaxAttendees

`func (o *VEventListItem) GetMaxAttendees() float32`

GetMaxAttendees returns the MaxAttendees field if non-nil, zero value otherwise.

### GetMaxAttendeesOk

`func (o *VEventListItem) GetMaxAttendeesOk() (*float32, bool)`

GetMaxAttendeesOk returns a tuple with the MaxAttendees field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetMaxAttendees

`func (o *VEventListItem) SetMaxAttendees(v float32)`

SetMaxAttendees sets MaxAttendees field to given value.


### GetGroup

`func (o *VEventListItem) GetGroup() VVEventListItemGroup`

GetGroup returns the Group field if non-nil, zero value otherwise.

### GetGroupOk

`func (o *VEventListItem) GetGroupOk() (*VVEventListItemGroup, bool)`

GetGroupOk returns a tuple with the Group field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroup

`func (o *VEventListItem) SetGroup(v VVEventListItemGroup)`

SetGroup sets Group field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


