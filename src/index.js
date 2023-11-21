import Handlebars from 'handlebars/runtime.js';

import '../assets/pages.js';
import '../assets/partials.js';

import { hbsAsyncRender, registerAsyncHelper } from "hbs-async-render";

const JSON_STRING = '{"tampadevs": {"id": "35835598", "name": "Tampa Devs", "urlname": "tampadevs", "link": "https://www.meetup.com/tampadevs", "logo": {"id": "503361543", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 2012}, "eventSearch": {"count": 2, "pageInfo": {"endCursor": "MQ=="}, "edges": [{"node": {"id": "296114390", "title": "Tampa Devs - Meet & Greet at Green Bench", "dateTime": "2023-11-29T18:30-05:00", "eventUrl": "https://www.meetup.com/tampadevs/events/296114390", "imageUrl": "https://secure-content.meetupstatic.com/images/classic-events/516457976/676x380.webp", "status": "published", "duration": "PT2H", "going": 63, "isFeatured": false, "venue": {"name": "Green Bench Brewing Company", "address": "1133 Baum Ave N", "city": "St. Petersburg", "state": "FL", "postalCode": "33705"}, "images": [{"id": "516457976", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}]}}]}}, "Tampa-Artificial-Intelligence-Meetup": {"id": "23443244", "name": "Tampa Bay Artificial Intelligence Meetup", "urlname": "tampa-artificial-intelligence-meetup", "link": "https://www.meetup.com/tampa-artificial-intelligence-meetup", "logo": {"id": "512408969", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 1392}, "eventSearch": {"count": 0, "pageInfo": {"endCursor": ""}, "edges": []}}, "data-scientists-tampa-bay": {"id": "8781532", "name": "Tampa Bay Data Science Group", "urlname": "Data-Scientists-Tampa-Bay", "link": "https://www.meetup.com/data-scientists-tampa-bay", "logo": {"id": "509899454", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 1241}, "eventSearch": {"count": 1, "pageInfo": {"endCursor": "MQ=="}, "edges": [{"node": {"id": "297359690", "title": "TBDSG: Item Response Theory - Using data and models to recognize good questions", "dateTime": "2023-12-13T18:30-05:00", "eventUrl": "https://www.meetup.com/data-scientists-tampa-bay/events/297359690", "imageUrl": "https://secure-content.meetupstatic.com/images/classic-events/516043311/676x380.webp", "status": "published", "duration": "PT3H", "going": 16, "isFeatured": false, "venue": {"name": "4701 Tony Alessi Sr Ave", "address": "4701 Tony Alessi Sr Ave", "city": "Tampa", "state": "FL", "postalCode": "33614"}, "images": [{"id": "516043311", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}]}}]}}, "tampa-bay-techies": {"id": "37015018", "name": "Tampa Bay Techies", "urlname": "tampa-bay-techies", "link": "https://www.meetup.com/tampa-bay-techies", "logo": {"id": "516529149", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 484}, "eventSearch": {"count": 2, "pageInfo": {"endCursor": "MQ=="}, "edges": [{"node": {"id": "297197839", "title": "Tampa Bay Techies & Tampa Devs & Tampa JUG present Dr. Venkat Subramaniam ", "dateTime": "2023-12-05T17:30-05:00", "eventUrl": "https://www.meetup.com/tampa-bay-techies/events/297197839", "imageUrl": "https://secure-content.meetupstatic.com/images/classic-events/517170070/676x380.webp", "status": "published", "duration": "PT2H30M", "going": 15, "isFeatured": false, "venue": {"name": "1150 Assembly Dr suite 500", "address": "1150 Assembly Dr suite 500", "city": "Tampa", "state": "FL", "postalCode": "33607"}, "images": [{"id": "517170070", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}]}}]}}, "High-Tech-Connect": {"id": "29724939", "name": "High Tech Connect", "urlname": "High-Tech-Connect", "link": "https://www.meetup.com/high-tech-connect", "logo": {"id": "515824173", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 2636}, "eventSearch": {"count": 0, "pageInfo": {"endCursor": ""}, "edges": []}}, "Tampa-DevOps-Meetup": {"id": "23235343", "name": "Tampa Bay DevOps Meetup", "urlname": "tampa-devops-meetup", "link": "https://www.meetup.com/tampa-devops-meetup", "logo": {"id": "503582290", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 2229}, "eventSearch": {"count": 0, "pageInfo": {"endCursor": ""}, "edges": []}}, "tampabayplatformengineering": {"id": "19642499", "name": "Tampa Bay Platform Engineering Meetup", "urlname": "tampabayplatformengineering", "link": "https://www.meetup.com/tampabayplatformengineering", "logo": {"id": "512438424", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 1802}, "eventSearch": {"count": 0, "pageInfo": {"endCursor": ""}, "edges": []}}, "tampa-bay-python": {"id": "416523", "name": "Tampa Bay Python", "urlname": "tampa-bay-python", "link": "https://www.meetup.com/tampa-bay-python", "logo": {"id": "490322960", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 1881}, "eventSearch": {"count": 0, "pageInfo": {"endCursor": ""}, "edges": []}}, "tampa-software-qa-and-testing-meetup": {"id": "29661579", "name": "Tampa Bay QA & Testing Meetup", "urlname": "tampa-software-qa-and-testing-meetup", "link": "https://www.meetup.com/tampa-software-qa-and-testing-meetup", "logo": {"id": "485851271", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 829}, "eventSearch": {"count": 0, "pageInfo": {"endCursor": ""}, "edges": []}}, "tampa-jug": {"id": "17149532", "name": "Tampa Java User Group", "urlname": "tampa-jug", "link": "https://www.meetup.com/tampa-jug", "logo": {"id": "508341219", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 1380}, "eventSearch": {"count": 1, "pageInfo": {"endCursor": "MQ=="}, "edges": [{"node": {"id": "296813914", "title": "Tampa JUG & Tampa Devs & Tampa Bay Techies present Dr. Venkat Subramaniam", "dateTime": "2023-12-05T17:30-05:00", "eventUrl": "https://www.meetup.com/tampa-jug/events/296813914", "imageUrl": "https://secure-content.meetupstatic.com/images/classic-events/517118097/676x380.webp", "status": "published", "duration": "PT2H30M", "going": 32, "isFeatured": false, "venue": {"name": "Kforce", "address": "1150 Assembly Dr Suite 500", "city": "Tampa", "state": "FL", "postalCode": "33605"}, "images": [{"id": "517118097", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}]}}]}}, "tampa-bay-aws": {"id": "22457405", "name": "Tampa Bay AWS User Group", "urlname": "tampa-bay-aws", "link": "https://www.meetup.com/tampa-bay-aws", "logo": {"id": "500891266", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 2918}, "eventSearch": {"count": 2, "pageInfo": {"endCursor": "MQ=="}, "edges": [{"node": {"id": "297144791", "title": "2023 re:Invent Recap!", "dateTime": "2023-12-14T18:00-05:00", "eventUrl": "https://www.meetup.com/tampa-bay-aws/events/297144791", "imageUrl": "https://secure-content.meetupstatic.com/images/classic-events/517418919/676x380.webp", "status": "published", "duration": "PT2H", "going": 54, "isFeatured": false, "venue": {"name": "Kforce", "address": "1150 Assembly Dr Suite 500", "city": "Tampa", "state": "FL", "postalCode": "33605"}, "images": [{"id": "517418919", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}]}}]}}, "microsoft-azure-tampa": {"id": "13176632", "name": "Tampa Bay Azure User Group", "urlname": "microsoft-azure-tampa", "link": "https://www.meetup.com/microsoft-azure-tampa", "logo": {"id": "499944480", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 1390}, "eventSearch": {"count": 0, "pageInfo": {"endCursor": ""}, "edges": []}}, "Women-Who-Code-Tampa": {"id": "11489182", "name": "Women Who Code Tampa", "urlname": "Women-Who-Code-Tampa", "link": "https://www.meetup.com/women-who-code-tampa", "logo": {"id": "507575765", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 1501}, "eventSearch": {"count": 2, "pageInfo": {"endCursor": "MQ=="}, "edges": [{"node": {"id": "296683654", "title": "\ud83d\udc9d Join Us for GivingTuesday and Empower Women Who Code\u00a0", "dateTime": "2023-11-28T01:00-05:00", "eventUrl": "https://www.meetup.com/women-who-code-tampa/events/296683654", "imageUrl": "https://secure-content.meetupstatic.com/images/classic-events/516500107/676x380.webp", "status": "published", "duration": "PT22H59M", "going": 3, "isFeatured": false, "venue": {"name": "Online event", "address": "", "city": "", "state": "", "postalCode": ""}, "images": [{"id": "516500107", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}]}}]}}, "tampa-bay-women-in-agile": {"id": "33227544", "name": "Tampa Bay Women in Agile", "urlname": "Tampa-Bay-Women-in-Agile", "link": "https://www.meetup.com/tampa-bay-women-in-agile", "logo": {"id": "492614267", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 795}, "eventSearch": {"count": 0, "pageInfo": {"endCursor": ""}, "edges": []}}, "tampa-bay-google-cloud-user-group": {"id": "36521057", "name": "Tampa Bay Google Cloud User Group", "urlname": "tampa-bay-google-cloud-user-group", "link": "https://www.meetup.com/tampa-bay-google-cloud-user-group", "logo": {"id": "506919696", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 182}, "eventSearch": {"count": 0, "pageInfo": {"endCursor": ""}, "edges": []}}, "tech4good-tampa": {"id": "26709613", "name": "Tech4Good Tampa", "urlname": "Tech4Good-Tampa", "link": "https://www.meetup.com/tech4good-tampa", "logo": {"id": "488814683", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 995}, "eventSearch": {"count": 1, "pageInfo": {"endCursor": "MQ=="}, "edges": [{"node": {"id": "297215741", "title": "Webinar: What is a CRM and how can it revolutionize your nonprofit\u2019s success?", "dateTime": "2023-12-06T12:00-05:00", "eventUrl": "https://www.meetup.com/tech4good-tampa/events/297215741", "imageUrl": "https://secure-content.meetupstatic.com/images/classic-events/517134402/676x380.webp", "status": "published", "duration": "PT1H", "going": 2, "isFeatured": false, "venue": {"name": "Online event", "address": "", "city": "", "state": "", "postalCode": ""}, "images": [{"id": "517134402", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}]}}]}}, "tampa-hackerspace": {"id": "10107822", "name": "Tampa Hackerspace", "urlname": "Tampa-Hackerspace", "link": "https://www.meetup.com/tampa-hackerspace", "logo": {"id": "379276462", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 6568}, "eventSearch": {"count": 28, "pageInfo": {"endCursor": "MQ=="}, "edges": [{"node": {"id": "297101941", "title": "Weekly Open Make Night", "dateTime": "2023-11-21T18:00-05:00", "eventUrl": "https://www.meetup.com/tampa-hackerspace/events/297101941", "imageUrl": "https://secure-content.meetupstatic.com/images/classic-events/496956604/676x380.webp", "status": "published", "duration": "PT3H", "going": 4, "isFeatured": false, "venue": {"name": "4931 W Nassau St", "address": "4931 W Nassau St", "city": "Tampa", "state": "FL", "postalCode": "33607"}, "images": [{"id": "496956604", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}]}}]}}, "project-codex": {"id": "29157671", "name": "Project Codex", "urlname": "project-codex", "link": "https://www.meetup.com/project-codex", "logo": {"id": "514415438", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 1267}, "eventSearch": {"count": 3, "pageInfo": {"endCursor": "MQ=="}, "edges": [{"node": {"id": "297157548", "title": "Virtual Coffee", "dateTime": "2023-11-24T09:00-05:00", "eventUrl": "https://www.meetup.com/project-codex/events/297157548", "imageUrl": "https://secure-content.meetupstatic.com/images/classic-events/495004128/676x380.webp", "status": "published", "duration": "PT1H", "going": 1, "isFeatured": false, "venue": {"name": "Online event", "address": "", "city": "", "state": "", "postalCode": ""}, "images": [{"id": "495004128", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}]}}]}}, "tampa-bay-data-engineering-group": {"id": "36057566", "name": "Tampa Bay Data Engineering Group", "urlname": "tampa-bay-data-engineering-group", "link": "https://www.meetup.com/tampa-bay-data-engineering-group", "logo": {"id": "510791309", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 397}, "eventSearch": {"count": 2, "pageInfo": {"endCursor": "MQ=="}, "edges": [{"node": {"id": "297052600", "title": "Zero ETL & Virtual Data Marts: A Discussion in Painless Data Engineering!", "dateTime": "2023-12-07T18:00-05:00", "eventUrl": "https://www.meetup.com/tampa-bay-data-engineering-group/events/297052600", "imageUrl": "https://secure-content.meetupstatic.com/images/classic-events/510791309/676x380.webp", "status": "published", "duration": "PT1H30M", "going": 16, "isFeatured": false, "venue": {"name": "Online event", "address": "", "city": "", "state": "", "postalCode": ""}, "images": []}}]}}, "gdg-central-florida": {"id": "11775232", "name": "Google Developer Group Central Florida", "urlname": "GDG-Central-Florida", "link": "https://www.meetup.com/gdg-central-florida", "logo": {"id": "484779220", "baseUrl": "https://secure-content.meetupstatic.com/images/classic-events/"}, "memberships": {"count": 943}, "eventSearch": {"count": 0, "pageInfo": {"endCursor": ""}, "edges": []}}}'

function formatAddress(venue) {
  // Extract the address components from the venue object
  const { name, address, city, state, postalCode } = venue;

  // Create the formatted address string
  const formattedAddress = `${address}, ${city}, ${state}, ${postalCode}`;

  return formattedAddress;
}

function formatDate(date) {
  const optionsDate = {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  };

  const optionsTime = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  };

  const datePart = date.toLocaleDateString('en-US', optionsDate);
  const timePart = date.toLocaleTimeString('en-US', optionsTime);

  return `${datePart} at ${timePart}`;
}

const jobBoardFeed = 'https://events.api.tampa.dev/';


function returnMapsLink(address, city, state, postalCode) {
  // Construct the Google Maps link using the provided location details
  const formattedAddress = encodeURIComponent(`${address}, ${city}, ${state} ${postalCode}`);
  return `https://www.google.com/maps?q=${formattedAddress}`;
}


//async funct for getting the query strings out of a url
async function parseQueryParams(url) {
  const params = {};
  const queryString = url.search.slice(1).split('&')
  queryString.forEach(item => {
    const kv = item.split('=')
    if (kv[0]) params[kv[0]] = decodeURIComponent(kv[1]) || true
  });
  return params;
}



//gets content type from headers, then parses the response / formats based on
// the return value from the api it is hitting. 
async function gatherResponse(response) {
  const { headers } = response;
  const contentType = headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.includes('application/vnd.api+json')) {
    return await response.json();
  }
  return await response.text();
}
//creates error response -  for if the url is not /v1/widget.
//creates headers etc for the return value and create new response that is returned from rendering the error page
async function errorResponse(status, message) {
  const resMeta = {
    headers: {
      'content-type': 'text/html',
    },
    status: status
  };
  return new Response(await hbsAsyncRender(Handlebars, 'error', { error_message: message, error_status: status }), resMeta);
}
//filter field based on params
async function filterTopLevelField(jsonData, fieldName) {
  try {
    const parsedData = await JSON.parse(jsonData);
    if (typeof parsedData === 'object' && fieldName in parsedData) {
      const filteredData = { [fieldName]: parsedData[fieldName] };
      return filteredData;
    } else {
      return {};
    }
  } catch (error) {
    console.error('Invalid JSON data.', error);
    return JSON.stringify({});
  }
}

//check if object is empty
function isObjectNotEmpty(obj) {
  return Object.keys(obj).length > 0;
}

async function handleNextEventWidget(url) {
  const init = {
    headers: {
      'content-type': 'text/html',
    },
  };
  //await results of parseQueryParams
  const params = await parseQueryParams(url);
  //fetch jobBoardFeed, init
  const response = await fetch(jobBoardFeed, init);
  //boardData is awaiting response from the other
  const eventData = await getEventData();
  const boardData = JSON.parse(eventData);

  const filteredData = await filterTopLevelField(JSON.stringify(boardData), Object.values(params)[0]);
  //console.log(await JSON.stringify(filteredData))
  //console.log(await JSON.stringify(filteredData['tampadevs']['eventSearch']['edges']))

  const TD = filteredData['tampadevs'];

  const date = new Date(TD['eventSearch']['edges'][0]['node']['dateTime']);
  const dayNumber = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });

  const address = formatAddress(TD['eventSearch']['edges'][0]['node']['venue']);
  const encodedAddress = encodeURIComponent(address);
  const googleMapsUrl = `https://www.google.com/maps?q=${encodedAddress}`;

  const event = {
    name: TD['name'],
    date: formatDate(date),
    dayNumber: dayNumber,
    googleMapsUrl: googleMapsUrl,
    month: month,
    address: address,
    node: TD['eventSearch']['edges'][0]['node'],
  };

  const eventString = JSON.stringify(event, null, 2);

  return new Response(
    await hbsAsyncRender(
      Handlebars,
      'widget', {
      event: event,
      eventString: eventString,
      meetupDetails: filteredData,
      meetupDetailsString: JSON.stringify(filteredData, null, 2),
      url_params: params,
    }),
    init
  );
}

async function getEventData() {
  // const res = await env.kv.get("event_data");
  const res = JSON_STRING;
  return res
}

async function handleJsonEvents() {
  try {
    const res = new Response(await getEventData(), { status: 200 });
    res.headers.set("Content-Type", "application/json");
    return res;
  } catch (e) {
    console.log(e);
  }
}

function handleCorsRequest() {
  var res = new Response(JSON.stringify({ message: 'Successfully added contact.' }), { status: 200 });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  return res;
}

async function handleRequest(request) {
  const url = new URL(request.url);

  if (request.method == 'OPTIONS') {
    return handleCorsRequest();
  }

  if (url.pathname === '/') {
    return await handleJsonEvents();
  } else if (url.pathname === '/v1/widget/') {
    return await handleNextEventWidget(url);
  } else {
    return errorResponse(404, "Not found");
  }

}

addEventListener('fetch', event => {
  return event.respondWith(handleRequest(request).catch(
    (err) => errorResponse(500, "We had a problem.")
  ));
});

export default {
  async fetch(request, env) {
    return await handleRequest(request).catch(
      (err) => errorResponse(500, "We had a problem.")
    )
  }
}
