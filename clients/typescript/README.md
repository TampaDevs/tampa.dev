## @tampadevs/events-api-client@1.0.0

This generator creates TypeScript/JavaScript client that utilizes [axios](https://github.com/axios/axios). The generated Node module can be used in the following environments:

Environment
* Node.js
* Webpack
* Browserify

Language level
* ES5 - you must have a Promises/A+ library installed
* ES6

Module system
* CommonJS
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition will be automatically resolved via `package.json`. ([Reference](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run `npm publish`

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install @tampadevs/events-api-client@1.0.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
```

### Documentation for API Endpoints

All URIs are relative to *https://api.tampa.dev*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*ClaimsApi* | [**v1ClaimCodeGet**](docs/ClaimsApi.md#v1claimcodeget) | **GET** /v1/claim/{code} | Get badge claim info
*ClaimsApi* | [**v1ClaimCodePost**](docs/ClaimsApi.md#v1claimcodepost) | **POST** /v1/claim/{code} | Claim a badge
*EventsApi* | [**_20260125eventsGet**](docs/EventsApi.md#_20260125eventsget) | **GET** /2026-01-25/events | Get all events
*EventsApi* | [**_20260125eventsNextGet**](docs/EventsApi.md#_20260125eventsnextget) | **GET** /2026-01-25/events/next | Get next event per group
*EventsApi* | [**v1CheckinCodePost**](docs/EventsApi.md#v1checkincodepost) | **POST** /v1/checkin/{code} | Check in to event
*EventsApi* | [**v1EventsEventIdRsvpDelete**](docs/EventsApi.md#v1eventseventidrsvpdelete) | **DELETE** /v1/events/{eventId}/rsvp | Cancel RSVP
*EventsApi* | [**v1EventsEventIdRsvpGet**](docs/EventsApi.md#v1eventseventidrsvpget) | **GET** /v1/events/{eventId}/rsvp | Get RSVP status
*EventsApi* | [**v1EventsEventIdRsvpPost**](docs/EventsApi.md#v1eventseventidrsvppost) | **POST** /v1/events/{eventId}/rsvp | RSVP to event
*EventsApi* | [**v1EventsEventIdRsvpSummaryGet**](docs/EventsApi.md#v1eventseventidrsvpsummaryget) | **GET** /v1/events/{eventId}/rsvp-summary | Get RSVP summary
*EventsApi* | [**v1EventsGet**](docs/EventsApi.md#v1eventsget) | **GET** /v1/events | List upcoming events
*FeedsApi* | [**_20260125feedGet**](docs/FeedsApi.md#_20260125feedget) | **GET** /2026-01-25/feed | Get RSS feed (alias)
*FeedsApi* | [**_20260125icalGet**](docs/FeedsApi.md#_20260125icalget) | **GET** /2026-01-25/ical | Get iCalendar feed (alias)
*FeedsApi* | [**_20260125icsGet**](docs/FeedsApi.md#_20260125icsget) | **GET** /2026-01-25/ics | Get iCalendar feed
*FeedsApi* | [**_20260125rssGet**](docs/FeedsApi.md#_20260125rssget) | **GET** /2026-01-25/rss | Get RSS feed
*FeedsApi* | [**_20260125webcalGet**](docs/FeedsApi.md#_20260125webcalget) | **GET** /2026-01-25/webcal | Get webcal feed
*FollowsApi* | [**v1UsersUsernameFollowDelete**](docs/FollowsApi.md#v1usersusernamefollowdelete) | **DELETE** /v1/users/{username}/follow | Unfollow user
*FollowsApi* | [**v1UsersUsernameFollowPost**](docs/FollowsApi.md#v1usersusernamefollowpost) | **POST** /v1/users/{username}/follow | Follow user
*FollowsApi* | [**v1UsersUsernameFollowersGet**](docs/FollowsApi.md#v1usersusernamefollowersget) | **GET** /v1/users/{username}/followers | List followers
*FollowsApi* | [**v1UsersUsernameFollowingGet**](docs/FollowsApi.md#v1usersusernamefollowingget) | **GET** /v1/users/{username}/following | List following
*GroupsApi* | [**_20260125groupsGet**](docs/GroupsApi.md#_20260125groupsget) | **GET** /2026-01-25/groups | Get all public groups
*GroupsApi* | [**_20260125groupsSlugGet**](docs/GroupsApi.md#_20260125groupsslugget) | **GET** /2026-01-25/groups/{slug} | Get a group by slug
*GroupsApi* | [**v1FavoritesGet**](docs/GroupsApi.md#v1favoritesget) | **GET** /v1/favorites | List favorite groups
*GroupsApi* | [**v1FavoritesGroupSlugDelete**](docs/GroupsApi.md#v1favoritesgroupslugdelete) | **DELETE** /v1/favorites/{groupSlug} | Remove group from favorites
*GroupsApi* | [**v1FavoritesGroupSlugPost**](docs/GroupsApi.md#v1favoritesgroupslugpost) | **POST** /v1/favorites/{groupSlug} | Add group to favorites
*GroupsApi* | [**v1GroupsGet**](docs/GroupsApi.md#v1groupsget) | **GET** /v1/groups | List groups
*GroupsApi* | [**v1GroupsSlugGet**](docs/GroupsApi.md#v1groupsslugget) | **GET** /v1/groups/{slug} | Get group details
*MCPApi* | [**mcpDelete**](docs/MCPApi.md#mcpdelete) | **DELETE** /mcp | MCP session termination
*MCPApi* | [**mcpGet**](docs/MCPApi.md#mcpget) | **GET** /mcp | MCP SSE endpoint (not supported)
*MCPApi* | [**mcpPost**](docs/MCPApi.md#mcppost) | **POST** /mcp | MCP JSON-RPC endpoint
*PagesApi* | [**htmlGet**](docs/PagesApi.md#htmlget) | **GET** /html | Deprecated — redirects to calendar
*PagesApi* | [**upcomingEventsGet**](docs/PagesApi.md#upcomingeventsget) | **GET** /upcoming-events | Deprecated — redirects to calendar
*SchemasApi* | [**_20260125schemasGet**](docs/SchemasApi.md#_20260125schemasget) | **GET** /2026-01-25/schemas | List all JSON schemas
*SchemasApi* | [**_20260125schemasNameGet**](docs/SchemasApi.md#_20260125schemasnameget) | **GET** /2026-01-25/schemas/{name} | Get specific JSON schema
*ScopesApi* | [**v1ScopesGet**](docs/ScopesApi.md#v1scopesget) | **GET** /v1/scopes | List OAuth scopes
*UserApi* | [**v1MeGet**](docs/UserApi.md#v1meget) | **GET** /v1/me | Get current user identity
*UserApi* | [**v1MeLinkedAccountsGet**](docs/UserApi.md#v1melinkedaccountsget) | **GET** /v1/me/linked-accounts | List linked OAuth accounts
*UserApi* | [**v1ProfileAchievementsGet**](docs/UserApi.md#v1profileachievementsget) | **GET** /v1/profile/achievements | Get achievement progress
*UserApi* | [**v1ProfileBadgesGet**](docs/UserApi.md#v1profilebadgesget) | **GET** /v1/profile/badges | Get earned badges
*UserApi* | [**v1ProfileEntitlementsGet**](docs/UserApi.md#v1profileentitlementsget) | **GET** /v1/profile/entitlements | Get active entitlements
*UserApi* | [**v1ProfileGet**](docs/UserApi.md#v1profileget) | **GET** /v1/profile | Get current user profile
*UserApi* | [**v1ProfilePatch**](docs/UserApi.md#v1profilepatch) | **PATCH** /v1/profile | Update current user profile
*UserApi* | [**v1ProfilePortfolioGet**](docs/UserApi.md#v1profileportfolioget) | **GET** /v1/profile/portfolio | List portfolio items
*UserApi* | [**v1ProfilePortfolioIdDelete**](docs/UserApi.md#v1profileportfolioiddelete) | **DELETE** /v1/profile/portfolio/{id} | Delete portfolio item
*UserApi* | [**v1ProfilePortfolioIdPatch**](docs/UserApi.md#v1profileportfolioidpatch) | **PATCH** /v1/profile/portfolio/{id} | Update portfolio item
*UserApi* | [**v1ProfilePortfolioPost**](docs/UserApi.md#v1profileportfoliopost) | **POST** /v1/profile/portfolio | Create portfolio item
*UserApi* | [**v1ProfileTokensGet**](docs/UserApi.md#v1profiletokensget) | **GET** /v1/profile/tokens | List personal access tokens
*UserApi* | [**v1ProfileTokensIdDelete**](docs/UserApi.md#v1profiletokensiddelete) | **DELETE** /v1/profile/tokens/{id} | Revoke personal access token
*UserApi* | [**v1ProfileTokensPost**](docs/UserApi.md#v1profiletokenspost) | **POST** /v1/profile/tokens | Create personal access token
*WidgetsApi* | [**widgetCarouselGet**](docs/WidgetsApi.md#widgetcarouselget) | **GET** /widget/carousel | Carousel HTML widget
*WidgetsApi* | [**widgetNextEventGet**](docs/WidgetsApi.md#widgetnexteventget) | **GET** /widget/next-event | Next event HTML widget


### Documentation For Models

 - [V20260125EventsGet200ResponseInner](docs/V20260125EventsGet200ResponseInner.md)
 - [V20260125GroupsGet200ResponseInner](docs/V20260125GroupsGet200ResponseInner.md)
 - [V20260125GroupsGet200ResponseInnerSocialLinks](docs/V20260125GroupsGet200ResponseInnerSocialLinks.md)
 - [V20260125GroupsSlugGet404Response](docs/V20260125GroupsSlugGet404Response.md)
 - [V20260125SchemasGet200Response](docs/V20260125SchemasGet200Response.md)
 - [V20260125SchemasGet200ResponseSchemasInner](docs/V20260125SchemasGet200ResponseSchemasInner.md)
 - [V20260125SchemasNameGet404Response](docs/V20260125SchemasNameGet404Response.md)
 - [VAchievementProgress](docs/VAchievementProgress.md)
 - [VCheckinResult](docs/VCheckinResult.md)
 - [VClaimBadgeResponse](docs/VClaimBadgeResponse.md)
 - [VClaimBadgeResponseBadge](docs/VClaimBadgeResponseBadge.md)
 - [VClaimInfo](docs/VClaimInfo.md)
 - [VClaimInfoBadge](docs/VClaimInfoBadge.md)
 - [VClaimInfoGroup](docs/VClaimInfoGroup.md)
 - [VCreateTokenRequest](docs/VCreateTokenRequest.md)
 - [VErrorResponse](docs/VErrorResponse.md)
 - [VEventListItem](docs/VEventListItem.md)
 - [VEventListItemGroup](docs/VEventListItemGroup.md)
 - [VFollowEntry](docs/VFollowEntry.md)
 - [VGroupDetail](docs/VGroupDetail.md)
 - [VGroupDetailAllOfUpcomingEvents](docs/VGroupDetailAllOfUpcomingEvents.md)
 - [VGroupListItem](docs/VGroupListItem.md)
 - [VLinkedAccount](docs/VLinkedAccount.md)
 - [VMcpError](docs/VMcpError.md)
 - [VPagination](docs/VPagination.md)
 - [VPortfolioItem](docs/VPortfolioItem.md)
 - [VPortfolioItemRequest](docs/VPortfolioItemRequest.md)
 - [VPortfolioItemUpdateRequest](docs/VPortfolioItemUpdateRequest.md)
 - [VRsvp](docs/VRsvp.md)
 - [VRsvpStatusResponse](docs/VRsvpStatusResponse.md)
 - [VRsvpSummary](docs/VRsvpSummary.md)
 - [VScope](docs/VScope.md)
 - [VToken](docs/VToken.md)
 - [VTokenCreated](docs/VTokenCreated.md)
 - [VUpdateProfileRequest](docs/VUpdateProfileRequest.md)
 - [VUserBadge](docs/VUserBadge.md)
 - [VUserBadgeGroup](docs/VUserBadgeGroup.md)
 - [VUserBadgeRarity](docs/VUserBadgeRarity.md)
 - [VUserBasic](docs/VUserBasic.md)
 - [VUserEntitlement](docs/VUserEntitlement.md)
 - [VUserProfile](docs/VUserProfile.md)
 - [VV1CheckinCodePost201Response](docs/VV1CheckinCodePost201Response.md)
 - [VV1ClaimCodeGet200Response](docs/VV1ClaimCodeGet200Response.md)
 - [VV1ClaimCodePost201Response](docs/VV1ClaimCodePost201Response.md)
 - [VV1EventsEventIdRsvpDelete200Response](docs/VV1EventsEventIdRsvpDelete200Response.md)
 - [VV1EventsEventIdRsvpDelete200ResponseData](docs/VV1EventsEventIdRsvpDelete200ResponseData.md)
 - [VV1EventsEventIdRsvpGet200Response](docs/VV1EventsEventIdRsvpGet200Response.md)
 - [VV1EventsEventIdRsvpPost201Response](docs/VV1EventsEventIdRsvpPost201Response.md)
 - [VV1EventsEventIdRsvpSummaryGet200Response](docs/VV1EventsEventIdRsvpSummaryGet200Response.md)
 - [VV1EventsGet200Response](docs/VV1EventsGet200Response.md)
 - [VV1FavoritesGet200Response](docs/VV1FavoritesGet200Response.md)
 - [VV1FavoritesGroupSlugPost200Response](docs/VV1FavoritesGroupSlugPost200Response.md)
 - [VV1FavoritesGroupSlugPost200ResponseData](docs/VV1FavoritesGroupSlugPost200ResponseData.md)
 - [VV1FavoritesGroupSlugPost201Response](docs/VV1FavoritesGroupSlugPost201Response.md)
 - [VV1FavoritesGroupSlugPost201ResponseData](docs/VV1FavoritesGroupSlugPost201ResponseData.md)
 - [VV1GroupsGet200Response](docs/VV1GroupsGet200Response.md)
 - [VV1GroupsSlugGet200Response](docs/VV1GroupsSlugGet200Response.md)
 - [VV1MeGet200Response](docs/VV1MeGet200Response.md)
 - [VV1MeLinkedAccountsGet200Response](docs/VV1MeLinkedAccountsGet200Response.md)
 - [VV1ProfileAchievementsGet200Response](docs/VV1ProfileAchievementsGet200Response.md)
 - [VV1ProfileBadgesGet200Response](docs/VV1ProfileBadgesGet200Response.md)
 - [VV1ProfileEntitlementsGet200Response](docs/VV1ProfileEntitlementsGet200Response.md)
 - [VV1ProfileGet200Response](docs/VV1ProfileGet200Response.md)
 - [VV1ProfilePortfolioGet200Response](docs/VV1ProfilePortfolioGet200Response.md)
 - [VV1ProfilePortfolioPost201Response](docs/VV1ProfilePortfolioPost201Response.md)
 - [VV1ProfileTokensGet200Response](docs/VV1ProfileTokensGet200Response.md)
 - [VV1ProfileTokensPost201Response](docs/VV1ProfileTokensPost201Response.md)
 - [VV1ScopesGet200Response](docs/VV1ScopesGet200Response.md)
 - [VV1UsersUsernameFollowPost200Response](docs/VV1UsersUsernameFollowPost200Response.md)
 - [VV1UsersUsernameFollowPost200ResponseData](docs/VV1UsersUsernameFollowPost200ResponseData.md)
 - [VV1UsersUsernameFollowPost201Response](docs/VV1UsersUsernameFollowPost201Response.md)
 - [VV1UsersUsernameFollowPost201ResponseData](docs/VV1UsersUsernameFollowPost201ResponseData.md)
 - [VV1UsersUsernameFollowersGet200Response](docs/VV1UsersUsernameFollowersGet200Response.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization


Authentication schemes defined for the API:
<a id="BearerToken"></a>
### BearerToken

- **Type**: Bearer authentication

