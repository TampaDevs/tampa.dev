# V20260125EventsGet200ResponseInner

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**Id** | **string** |  | 
**Title** | **string** |  | 
**Description** | Pointer to **string** |  | [optional] 
**DateTime** | **string** |  | 
**Duration** | Pointer to **string** |  | [optional] 
**EventUrl** | **string** |  | 
**Status** | **string** |  | 
**EventType** | Pointer to **string** |  | [optional] 
**RsvpCount** | **float32** |  | 
**Venues** | **[]interface{}** |  | 
**Photo** | Pointer to **interface{}** |  | [optional] 
**Group** | Pointer to **interface{}** |  | [optional] 
**Address** | **string** |  | 
**GoogleMapsUrl** | **string** |  | 
**PhotoUrl** | **string** |  | 
**IsOnline** | **bool** |  | 

## Methods

### NewV20260125EventsGet200ResponseInner

`func NewV20260125EventsGet200ResponseInner(id string, title string, dateTime string, eventUrl string, status string, rsvpCount float32, venues []interface{}, address string, googleMapsUrl string, photoUrl string, isOnline bool, ) *V20260125EventsGet200ResponseInner`

NewV20260125EventsGet200ResponseInner instantiates a new V20260125EventsGet200ResponseInner object
This constructor will assign default values to properties that have it defined,
and makes sure properties required by API are set, but the set of arguments
will change when the set of required properties is changed

### NewV20260125EventsGet200ResponseInnerWithDefaults

`func NewV20260125EventsGet200ResponseInnerWithDefaults() *V20260125EventsGet200ResponseInner`

NewV20260125EventsGet200ResponseInnerWithDefaults instantiates a new V20260125EventsGet200ResponseInner object
This constructor will only assign default values to properties that have it defined,
but it doesn't guarantee that properties required by API are set

### GetId

`func (o *V20260125EventsGet200ResponseInner) GetId() string`

GetId returns the Id field if non-nil, zero value otherwise.

### GetIdOk

`func (o *V20260125EventsGet200ResponseInner) GetIdOk() (*string, bool)`

GetIdOk returns a tuple with the Id field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetId

`func (o *V20260125EventsGet200ResponseInner) SetId(v string)`

SetId sets Id field to given value.


### GetTitle

`func (o *V20260125EventsGet200ResponseInner) GetTitle() string`

GetTitle returns the Title field if non-nil, zero value otherwise.

### GetTitleOk

`func (o *V20260125EventsGet200ResponseInner) GetTitleOk() (*string, bool)`

GetTitleOk returns a tuple with the Title field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetTitle

`func (o *V20260125EventsGet200ResponseInner) SetTitle(v string)`

SetTitle sets Title field to given value.


### GetDescription

`func (o *V20260125EventsGet200ResponseInner) GetDescription() string`

GetDescription returns the Description field if non-nil, zero value otherwise.

### GetDescriptionOk

`func (o *V20260125EventsGet200ResponseInner) GetDescriptionOk() (*string, bool)`

GetDescriptionOk returns a tuple with the Description field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDescription

`func (o *V20260125EventsGet200ResponseInner) SetDescription(v string)`

SetDescription sets Description field to given value.

### HasDescription

`func (o *V20260125EventsGet200ResponseInner) HasDescription() bool`

HasDescription returns a boolean if a field has been set.

### GetDateTime

`func (o *V20260125EventsGet200ResponseInner) GetDateTime() string`

GetDateTime returns the DateTime field if non-nil, zero value otherwise.

### GetDateTimeOk

`func (o *V20260125EventsGet200ResponseInner) GetDateTimeOk() (*string, bool)`

GetDateTimeOk returns a tuple with the DateTime field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDateTime

`func (o *V20260125EventsGet200ResponseInner) SetDateTime(v string)`

SetDateTime sets DateTime field to given value.


### GetDuration

`func (o *V20260125EventsGet200ResponseInner) GetDuration() string`

GetDuration returns the Duration field if non-nil, zero value otherwise.

### GetDurationOk

`func (o *V20260125EventsGet200ResponseInner) GetDurationOk() (*string, bool)`

GetDurationOk returns a tuple with the Duration field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetDuration

`func (o *V20260125EventsGet200ResponseInner) SetDuration(v string)`

SetDuration sets Duration field to given value.

### HasDuration

`func (o *V20260125EventsGet200ResponseInner) HasDuration() bool`

HasDuration returns a boolean if a field has been set.

### GetEventUrl

`func (o *V20260125EventsGet200ResponseInner) GetEventUrl() string`

GetEventUrl returns the EventUrl field if non-nil, zero value otherwise.

### GetEventUrlOk

`func (o *V20260125EventsGet200ResponseInner) GetEventUrlOk() (*string, bool)`

GetEventUrlOk returns a tuple with the EventUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventUrl

`func (o *V20260125EventsGet200ResponseInner) SetEventUrl(v string)`

SetEventUrl sets EventUrl field to given value.


### GetStatus

`func (o *V20260125EventsGet200ResponseInner) GetStatus() string`

GetStatus returns the Status field if non-nil, zero value otherwise.

### GetStatusOk

`func (o *V20260125EventsGet200ResponseInner) GetStatusOk() (*string, bool)`

GetStatusOk returns a tuple with the Status field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetStatus

`func (o *V20260125EventsGet200ResponseInner) SetStatus(v string)`

SetStatus sets Status field to given value.


### GetEventType

`func (o *V20260125EventsGet200ResponseInner) GetEventType() string`

GetEventType returns the EventType field if non-nil, zero value otherwise.

### GetEventTypeOk

`func (o *V20260125EventsGet200ResponseInner) GetEventTypeOk() (*string, bool)`

GetEventTypeOk returns a tuple with the EventType field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetEventType

`func (o *V20260125EventsGet200ResponseInner) SetEventType(v string)`

SetEventType sets EventType field to given value.

### HasEventType

`func (o *V20260125EventsGet200ResponseInner) HasEventType() bool`

HasEventType returns a boolean if a field has been set.

### GetRsvpCount

`func (o *V20260125EventsGet200ResponseInner) GetRsvpCount() float32`

GetRsvpCount returns the RsvpCount field if non-nil, zero value otherwise.

### GetRsvpCountOk

`func (o *V20260125EventsGet200ResponseInner) GetRsvpCountOk() (*float32, bool)`

GetRsvpCountOk returns a tuple with the RsvpCount field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetRsvpCount

`func (o *V20260125EventsGet200ResponseInner) SetRsvpCount(v float32)`

SetRsvpCount sets RsvpCount field to given value.


### GetVenues

`func (o *V20260125EventsGet200ResponseInner) GetVenues() []interface{}`

GetVenues returns the Venues field if non-nil, zero value otherwise.

### GetVenuesOk

`func (o *V20260125EventsGet200ResponseInner) GetVenuesOk() (*[]interface{}, bool)`

GetVenuesOk returns a tuple with the Venues field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetVenues

`func (o *V20260125EventsGet200ResponseInner) SetVenues(v []interface{})`

SetVenues sets Venues field to given value.


### GetPhoto

`func (o *V20260125EventsGet200ResponseInner) GetPhoto() interface{}`

GetPhoto returns the Photo field if non-nil, zero value otherwise.

### GetPhotoOk

`func (o *V20260125EventsGet200ResponseInner) GetPhotoOk() (*interface{}, bool)`

GetPhotoOk returns a tuple with the Photo field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPhoto

`func (o *V20260125EventsGet200ResponseInner) SetPhoto(v interface{})`

SetPhoto sets Photo field to given value.

### HasPhoto

`func (o *V20260125EventsGet200ResponseInner) HasPhoto() bool`

HasPhoto returns a boolean if a field has been set.

### SetPhotoNil

`func (o *V20260125EventsGet200ResponseInner) SetPhotoNil(b bool)`

 SetPhotoNil sets the value for Photo to be an explicit nil

### UnsetPhoto
`func (o *V20260125EventsGet200ResponseInner) UnsetPhoto()`

UnsetPhoto ensures that no value is present for Photo, not even an explicit nil
### GetGroup

`func (o *V20260125EventsGet200ResponseInner) GetGroup() interface{}`

GetGroup returns the Group field if non-nil, zero value otherwise.

### GetGroupOk

`func (o *V20260125EventsGet200ResponseInner) GetGroupOk() (*interface{}, bool)`

GetGroupOk returns a tuple with the Group field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGroup

`func (o *V20260125EventsGet200ResponseInner) SetGroup(v interface{})`

SetGroup sets Group field to given value.

### HasGroup

`func (o *V20260125EventsGet200ResponseInner) HasGroup() bool`

HasGroup returns a boolean if a field has been set.

### SetGroupNil

`func (o *V20260125EventsGet200ResponseInner) SetGroupNil(b bool)`

 SetGroupNil sets the value for Group to be an explicit nil

### UnsetGroup
`func (o *V20260125EventsGet200ResponseInner) UnsetGroup()`

UnsetGroup ensures that no value is present for Group, not even an explicit nil
### GetAddress

`func (o *V20260125EventsGet200ResponseInner) GetAddress() string`

GetAddress returns the Address field if non-nil, zero value otherwise.

### GetAddressOk

`func (o *V20260125EventsGet200ResponseInner) GetAddressOk() (*string, bool)`

GetAddressOk returns a tuple with the Address field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetAddress

`func (o *V20260125EventsGet200ResponseInner) SetAddress(v string)`

SetAddress sets Address field to given value.


### GetGoogleMapsUrl

`func (o *V20260125EventsGet200ResponseInner) GetGoogleMapsUrl() string`

GetGoogleMapsUrl returns the GoogleMapsUrl field if non-nil, zero value otherwise.

### GetGoogleMapsUrlOk

`func (o *V20260125EventsGet200ResponseInner) GetGoogleMapsUrlOk() (*string, bool)`

GetGoogleMapsUrlOk returns a tuple with the GoogleMapsUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetGoogleMapsUrl

`func (o *V20260125EventsGet200ResponseInner) SetGoogleMapsUrl(v string)`

SetGoogleMapsUrl sets GoogleMapsUrl field to given value.


### GetPhotoUrl

`func (o *V20260125EventsGet200ResponseInner) GetPhotoUrl() string`

GetPhotoUrl returns the PhotoUrl field if non-nil, zero value otherwise.

### GetPhotoUrlOk

`func (o *V20260125EventsGet200ResponseInner) GetPhotoUrlOk() (*string, bool)`

GetPhotoUrlOk returns a tuple with the PhotoUrl field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetPhotoUrl

`func (o *V20260125EventsGet200ResponseInner) SetPhotoUrl(v string)`

SetPhotoUrl sets PhotoUrl field to given value.


### GetIsOnline

`func (o *V20260125EventsGet200ResponseInner) GetIsOnline() bool`

GetIsOnline returns the IsOnline field if non-nil, zero value otherwise.

### GetIsOnlineOk

`func (o *V20260125EventsGet200ResponseInner) GetIsOnlineOk() (*bool, bool)`

GetIsOnlineOk returns a tuple with the IsOnline field if it's non-nil, zero value otherwise
and a boolean to check if the value has been set.

### SetIsOnline

`func (o *V20260125EventsGet200ResponseInner) SetIsOnline(v bool)`

SetIsOnline sets IsOnline field to given value.



[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


