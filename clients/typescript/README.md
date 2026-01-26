## @tampa-devs/events-api-client@1.0.0

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
npm install @tampa-devs/events-api-client@1.0.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
```

### Documentation for API Endpoints

All URIs are relative to *https://events.api.tampa.dev*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*EventsApi* | [**_20260125eventsGet**](docs/EventsApi.md#_20260125eventsget) | **GET** /2026-01-25/events | Get all events
*EventsApi* | [**_20260125eventsNextGet**](docs/EventsApi.md#_20260125eventsnextget) | **GET** /2026-01-25/events/next | Get next event per group
*FeedsApi* | [**_20260125feedGet**](docs/FeedsApi.md#_20260125feedget) | **GET** /2026-01-25/feed | Get RSS feed (alias)
*FeedsApi* | [**_20260125icalGet**](docs/FeedsApi.md#_20260125icalget) | **GET** /2026-01-25/ical | Get iCalendar feed (alias)
*FeedsApi* | [**_20260125icsGet**](docs/FeedsApi.md#_20260125icsget) | **GET** /2026-01-25/ics | Get iCalendar feed
*FeedsApi* | [**_20260125rssGet**](docs/FeedsApi.md#_20260125rssget) | **GET** /2026-01-25/rss | Get RSS feed
*FeedsApi* | [**_20260125webcalGet**](docs/FeedsApi.md#_20260125webcalget) | **GET** /2026-01-25/webcal | Get webcal feed
*PagesApi* | [**htmlGet**](docs/PagesApi.md#htmlget) | **GET** /html | HTML page with upcoming events
*PagesApi* | [**upcomingEventsGet**](docs/PagesApi.md#upcomingeventsget) | **GET** /upcoming-events | Upcoming events HTML page
*SchemasApi* | [**_20260125schemasGet**](docs/SchemasApi.md#_20260125schemasget) | **GET** /2026-01-25/schemas | List all JSON schemas
*SchemasApi* | [**_20260125schemasNameGet**](docs/SchemasApi.md#_20260125schemasnameget) | **GET** /2026-01-25/schemas/{name} | Get specific JSON schema
*WidgetsApi* | [**widgetCarouselGet**](docs/WidgetsApi.md#widgetcarouselget) | **GET** /widget/carousel | Carousel HTML widget
*WidgetsApi* | [**widgetNextEventGet**](docs/WidgetsApi.md#widgetnexteventget) | **GET** /widget/next-event | Next event HTML widget


### Documentation For Models

 - [Model20260125EventsGet200ResponseInner](docs/Model20260125EventsGet200ResponseInner.md)
 - [Model20260125SchemasGet200Response](docs/Model20260125SchemasGet200Response.md)
 - [Model20260125SchemasGet200ResponseSchemasInner](docs/Model20260125SchemasGet200ResponseSchemasInner.md)
 - [Model20260125SchemasNameGet404Response](docs/Model20260125SchemasNameGet404Response.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization

Endpoints do not require authorization.

