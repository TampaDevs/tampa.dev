# events.api.tampa.dev

Public API to retrieve information about upcoming tech events in the Tampa Bay area.

## Usage

Simply send a GET request to https://events.api.tampa.dev/.

Want an RSS feed? Grab it at https://events.api.tampa.dev/rss.

Want an iCal feed? It's at https://events.api.tampa.dev/ical.

You can also access this API at the following additional URLs:

- https://tampa.dev/events.json (for JSON),
- https://tampa.dev/feed (for RSS), and
- https://tampa.dev/webcal (for iCal)

### Filters

You can supply optional filters as query parameters:

- `groups`: A comma-separated list of groups to return. These should match the group's `urlname` (e.g., `tampadevs`).
- `noempty`: Filter groups with no upcoming events from the response.
- `noonline`: Filter online events from the response.

_Note: These filters also work when you're requesting results in iCal, HTML, RSS, and any other formats._

Example:

https://events.api.tampa.dev/?groups=tampadevs,tampa-bay-techies&noonline&noempty

## Widgets

The Events API also provides several HTML views and embeddable widgets. These support the same parameters as the other API routes. 

### Next Event Widget

https://events.api.tampa.dev/widget/next-event?groups=tampadevs

_Note: This widget is intended to display events for a single group, so remember to specify the `groups` query parameter with a single group name._

### Events Carousel

https://events.api.tampa.dev/widget/carousel

### Upcoming Events Page

https://events.api.tampa.dev/html or https://tampa.dev/upcoming-events

## Development

To start the local development environment, execute the following command:

```bash
wrangler dev -l
```

Your local instance of the Events API will become available at http://localhost:8787.

## Data Freshness

Data is served from a cache in Workers KV. This cache data is updated every 30 minutes.

# Add Your Meetup

If you'd like us to aggregate event data from your Meetup group, please [open an issue](https://github.com/TampaDevs/events.api.tampa.dev/issues/new/choose).

## Response

```
{
   "High-Tech-Connect" : {
      "eventSearch" : {
         "count" : 0,
         "edges" : [],
         "pageInfo" : {
            "endCursor" : ""
         }
      },
      "id" : "29724939",
      "link" : "https://www.meetup.com/high-tech-connect",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "476652496"
      },
      "memberships" : {
         "count" : 2495
      },
      "name" : "High Tech Connect",
      "urlname" : "High-Tech-Connect"
   },
   "Tampa-Artificial-Intelligence-Meetup" : {
      "eventSearch" : {
         "count" : 0,
         "edges" : [],
         "pageInfo" : {
            "endCursor" : ""
         }
      },
      "id" : "23443244",
      "link" : "https://www.meetup.com/tampa-artificial-intelligence-meetup",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "512408969"
      },
      "memberships" : {
         "count" : 1194
      },
      "name" : "Tampa Artificial Intelligence Meetup",
      "urlname" : "tampa-artificial-intelligence-meetup"
   },
   "Women-Who-Code-Tampa" : {
      "eventSearch" : {
         "count" : 3,
         "edges" : [
            {
               "node" : {
                  "dateTime" : "2023-06-27T14:00-04:00",
                  "duration" : "PT1H",
                  "eventUrl" : "https://www.meetup.com/women-who-code-tampa/events/294030851",
                  "going" : 4,
                  "id" : "294030851",
                  "imageUrl" : "https://secure-content.meetupstatic.com/images/classic-events/513482168/676x380.webp",
                  "images" : [
                     {
                        "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
                        "id" : "513482168"
                     }
                  ],
                  "isFeatured" : false,
                  "status" : "published",
                  "title" : "Navigating Your Tech Career: Opportunities & Self Advocacy | Partner Event",
                  "venue" : {
                     "address" : "",
                     "city" : "",
                     "name" : "Online event",
                     "postalCode" : "",
                     "state" : ""
                  }
               }
            }
         ],
         "pageInfo" : {
            "endCursor" : "MQ=="
         }
      },
      "id" : "11489182",
      "link" : "https://www.meetup.com/women-who-code-tampa",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "507575765"
      },
      "memberships" : {
         "count" : 1460
      },
      "name" : "Women Who Code Tampa",
      "urlname" : "Women-Who-Code-Tampa"
   },
   "data-scientists-tampa-bay" : {
      "eventSearch" : {
         "count" : 1,
         "edges" : [
            {
               "node" : {
                  "dateTime" : "2023-08-23T08:00-04:00",
                  "duration" : "PT58H",
                  "eventUrl" : "https://www.meetup.com/data-scientists-tampa-bay/events/291994112",
                  "going" : 6,
                  "id" : "291994112",
                  "imageUrl" : "https://secure-content.meetupstatic.com/images/classic-events/509899454/676x380.webp",
                  "images" : [],
                  "isFeatured" : false,
                  "status" : "published",
                  "title" : "D4 - Innovation and Entrepreneurship in Data, Design, Development & Discovery",
                  "venue" : {
                     "address" : "802 E Whiting St",
                     "city" : "Tampa",
                     "name" : "Embarc Collective",
                     "postalCode" : "33602",
                     "state" : "FL"
                  }
               }
            }
         ],
         "pageInfo" : {
            "endCursor" : "MQ=="
         }
      },
      "id" : "8781532",
      "link" : "https://www.meetup.com/data-scientists-tampa-bay",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "509899454"
      },
      "memberships" : {
         "count" : 1203
      },
      "name" : "Tampa Bay Data Science Group",
      "urlname" : "Data-Scientists-Tampa-Bay"
   },
   "microsoft-azure-tampa" : {
      "eventSearch" : {
         "count" : 0,
         "edges" : [],
         "pageInfo" : {
            "endCursor" : ""
         }
      },
      "id" : "13176632",
      "link" : "https://www.meetup.com/microsoft-azure-tampa",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "499944480"
      },
      "memberships" : {
         "count" : 1383
      },
      "name" : "Tampa Bay Azure User Group",
      "urlname" : "microsoft-azure-tampa"
   },
   "project-codex" : {
      "eventSearch" : {
         "count" : 3,
         "edges" : [
            {
               "node" : {
                  "dateTime" : "2023-06-23T09:00-04:00",
                  "duration" : "PT1H",
                  "eventUrl" : "https://www.meetup.com/project-codex/events/293954324",
                  "going" : 5,
                  "id" : "293954324",
                  "imageUrl" : "https://secure-content.meetupstatic.com/images/classic-events/495004128/676x380.webp",
                  "images" : [
                     {
                        "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
                        "id" : "495004128"
                     }
                  ],
                  "isFeatured" : false,
                  "status" : "published",
                  "title" : "Virtual Coffee",
                  "venue" : {
                     "address" : "",
                     "city" : "",
                     "name" : "Online event",
                     "postalCode" : "",
                     "state" : ""
                  }
               }
            }
         ],
         "pageInfo" : {
            "endCursor" : "MQ=="
         }
      },
      "id" : "29157671",
      "link" : "https://www.meetup.com/project-codex",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "484166420"
      },
      "memberships" : {
         "count" : 1194
      },
      "name" : "Project Codex",
      "urlname" : "project-codex"
   },
   "tampa-bay-aws" : {
      "eventSearch" : {
         "count" : 0,
         "edges" : [],
         "pageInfo" : {
            "endCursor" : ""
         }
      },
      "id" : "22457405",
      "link" : "https://www.meetup.com/tampa-bay-aws",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "500891266"
      },
      "memberships" : {
         "count" : 2667
      },
      "name" : "Tampa Bay AWS User Group",
      "urlname" : "tampa-bay-aws"
   },
   "tampa-bay-google-cloud-user-group" : {
      "eventSearch" : {
         "count" : 1,
         "edges" : [
            {
               "node" : {
                  "dateTime" : "2023-06-22T18:00-04:00",
                  "duration" : "PT2H",
                  "eventUrl" : "https://www.meetup.com/tampa-bay-google-cloud-user-group/events/293345100",
                  "going" : 17,
                  "id" : "293345100",
                  "imageUrl" : "https://secure-content.meetupstatic.com/images/classic-events/506919696/676x380.webp",
                  "images" : [],
                  "isFeatured" : false,
                  "status" : "published",
                  "title" : "Google Cloud Generative AI & LLMs",
                  "venue" : {
                     "address" : "2101 E Palm Ave",
                     "city" : "Tampa",
                     "name" : "2101 E Palm Ave",
                     "postalCode" : "33605",
                     "state" : "FL"
                  }
               }
            }
         ],
         "pageInfo" : {
            "endCursor" : "MQ=="
         }
      },
      "id" : "36521057",
      "link" : "https://www.meetup.com/tampa-bay-google-cloud-user-group",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "506919696"
      },
      "memberships" : {
         "count" : 142
      },
      "name" : "Tampa Bay Google Cloud User Group",
      "urlname" : "tampa-bay-google-cloud-user-group"
   },
   "tampa-bay-python" : {
      "eventSearch" : {
         "count" : 0,
         "edges" : [],
         "pageInfo" : {
            "endCursor" : ""
         }
      },
      "id" : "416523",
      "link" : "https://www.meetup.com/tampa-bay-python",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "490322960"
      },
      "memberships" : {
         "count" : 1849
      },
      "name" : "Tampa Bay Python",
      "urlname" : "tampa-bay-python"
   },
   "tampa-bay-techies" : {
      "eventSearch" : {
         "count" : 5,
         "edges" : [
            {
               "node" : {
                  "dateTime" : "2023-06-17T16:00-04:00",
                  "duration" : "PT2H",
                  "eventUrl" : "https://www.meetup.com/tampa-bay-techies/events/294004211",
                  "going" : 28,
                  "id" : "294004211",
                  "imageUrl" : "https://secure-content.meetupstatic.com/images/classic-events/513451129/676x380.webp",
                  "images" : [
                     {
                        "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
                        "id" : "513451129"
                     }
                  ],
                  "isFeatured" : false,
                  "status" : "published",
                  "title" : "Tampa Bay Techies Minigolf Meetup",
                  "venue" : {
                     "address" : "25297 Sierra Center Blvd",
                     "city" : "Lutz",
                     "name" : "PopStroke Tampa",
                     "postalCode" : "33559",
                     "state" : "FL"
                  }
               }
            }
         ],
         "pageInfo" : {
            "endCursor" : "MQ=="
         }
      },
      "id" : "37015018",
      "link" : "https://www.meetup.com/tampa-bay-techies",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "513450979"
      },
      "memberships" : {
         "count" : 110
      },
      "name" : "Tampa Bay Techies",
      "urlname" : "tampa-bay-techies"
   },
   "tampa-devops-meetup" : {
      "eventSearch" : {
         "count" : 1,
         "edges" : [
            {
               "node" : {
                  "dateTime" : "2023-07-18T18:00-04:00",
                  "duration" : "PT2H",
                  "eventUrl" : "https://www.meetup.com/tampa-devops-meetup/events/291645125",
                  "going" : 37,
                  "id" : "291645125",
                  "imageUrl" : "https://secure-content.meetupstatic.com/images/classic-events/511284101/676x380.webp",
                  "images" : [
                     {
                        "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
                        "id" : "511284101"
                     }
                  ],
                  "isFeatured" : false,
                  "status" : "published",
                  "title" : "Tampa Bay DevOps Meetup - July Event",
                  "venue" : {
                     "address" : "140 Fountain Pkwy N Suite 400",
                     "city" : "St. Petersburg",
                     "name" : "Accenture",
                     "postalCode" : "33716",
                     "state" : "FL"
                  }
               }
            }
         ],
         "pageInfo" : {
            "endCursor" : "MQ=="
         }
      },
      "id" : "23235343",
      "link" : "https://www.meetup.com/tampa-devops-meetup",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "503582290"
      },
      "memberships" : {
         "count" : 2168
      },
      "name" : "Tampa Bay DevOps Meetup",
      "urlname" : "tampa-devops-meetup"
   },
   "tampa-hackerspace" : {
      "eventSearch" : {
         "count" : 30,
         "edges" : [
            {
               "node" : {
                  "dateTime" : "2023-06-17T18:00-04:00",
                  "duration" : "PT5H55M",
                  "eventUrl" : "https://www.meetup.com/tampa-hackerspace/events/294063678",
                  "going" : 9,
                  "id" : "294063678",
                  "imageUrl" : "https://secure-content.meetupstatic.com/images/classic-events/508463731/676x380.webp",
                  "images" : [
                     {
                        "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
                        "id" : "508463731"
                     }
                  ],
                  "isFeatured" : false,
                  "status" : "published",
                  "title" : "Tampa Hackerspace Board Game Night and Potluck",
                  "venue" : {
                     "address" : "4935 W Nassau St",
                     "city" : "Tampa",
                     "name" : "Tampa Hackerspace West",
                     "postalCode" : "33607",
                     "state" : "fl"
                  }
               }
            }
         ],
         "pageInfo" : {
            "endCursor" : "MQ=="
         }
      },
      "id" : "10107822",
      "link" : "https://www.meetup.com/tampa-hackerspace",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "379276462"
      },
      "memberships" : {
         "count" : 6333
      },
      "name" : "Tampa Hackerspace",
      "urlname" : "Tampa-Hackerspace"
   },
   "tampa-jug" : {
      "eventSearch" : {
         "count" : 1,
         "edges" : [
            {
               "node" : {
                  "dateTime" : "2023-06-28T18:30-04:00",
                  "duration" : "PT3H",
                  "eventUrl" : "https://www.meetup.com/tampa-jug/events/293939839",
                  "going" : 9,
                  "id" : "293939839",
                  "imageUrl" : "https://secure-content.meetupstatic.com/images/classic-events/513341869/676x380.webp",
                  "images" : [
                     {
                        "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
                        "id" : "513341869"
                     }
                  ],
                  "isFeatured" : false,
                  "status" : "published",
                  "title" : "Meet & Greet with Tampa Devs",
                  "venue" : {
                     "address" : "1910 N Ola Ave",
                     "city" : "Tampa",
                     "name" : "Armature Works",
                     "postalCode" : "33602",
                     "state" : "FL"
                  }
               }
            }
         ],
         "pageInfo" : {
            "endCursor" : "MQ=="
         }
      },
      "id" : "17149532",
      "link" : "https://www.meetup.com/tampa-jug",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "508341219"
      },
      "memberships" : {
         "count" : 1294
      },
      "name" : "Tampa Java User Group",
      "urlname" : "tampa-jug"
   },
   "tampa-software-qa-and-testing-meetup" : {
      "eventSearch" : {
         "count" : 0,
         "edges" : [],
         "pageInfo" : {
            "endCursor" : ""
         }
      },
      "id" : "29661579",
      "link" : "https://www.meetup.com/tampa-software-qa-and-testing-meetup",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "485851271"
      },
      "memberships" : {
         "count" : 822
      },
      "name" : "Tampa Bay QA & Testing Meetup",
      "urlname" : "tampa-software-qa-and-testing-meetup"
   },
   "tampadevs" : {
      "eventSearch" : {
         "count" : 4,
         "edges" : [
            {
               "node" : {
                  "dateTime" : "2023-06-21T18:30-04:00",
                  "duration" : "PT2H",
                  "eventUrl" : "https://www.meetup.com/tampadevs/events/293624305",
                  "going" : 77,
                  "id" : "293624305",
                  "imageUrl" : "https://secure-content.meetupstatic.com/images/classic-events/512959870/676x380.webp",
                  "images" : [
                     {
                        "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
                        "id" : "512959870"
                     }
                  ],
                  "isFeatured" : true,
                  "status" : "published",
                  "title" : "Selling Yourself: The Art of Interviewing",
                  "venue" : {
                     "address" : "802 E Whiting St",
                     "city" : "Tampa",
                     "name" : "Embarc Collective",
                     "postalCode" : "33602",
                     "state" : "FL"
                  }
               }
            }
         ],
         "pageInfo" : {
            "endCursor" : "MQ=="
         }
      },
      "id" : "35835598",
      "link" : "https://www.meetup.com/tampadevs",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "503361543"
      },
      "memberships" : {
         "count" : 1605
      },
      "name" : "Tampa Devs",
      "urlname" : "tampadevs"
   },
   "tech4good-tampa" : {
      "eventSearch" : {
         "count" : 2,
         "edges" : [
            {
               "node" : {
                  "dateTime" : "2023-06-19T12:00-04:00",
                  "duration" : "PT1H",
                  "eventUrl" : "https://www.meetup.com/tech4good-tampa/events/292562176",
                  "going" : 11,
                  "id" : "292562176",
                  "imageUrl" : "https://secure-content.meetupstatic.com/images/classic-events/513437328/676x380.webp",
                  "images" : [
                     {
                        "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
                        "id" : "513437328"
                     }
                  ],
                  "isFeatured" : false,
                  "status" : "published",
                  "title" : "Webinar - Content that Captures: Telling Your Organization's Story Online",
                  "venue" : {
                     "address" : "",
                     "city" : "",
                     "name" : "Online event",
                     "postalCode" : "",
                     "state" : ""
                  }
               }
            }
         ],
         "pageInfo" : {
            "endCursor" : "MQ=="
         }
      },
      "id" : "26709613",
      "link" : "https://www.meetup.com/tech4good-tampa",
      "logo" : {
         "baseUrl" : "https://secure-content.meetupstatic.com/images/classic-events/",
         "id" : "488814683"
      },
      "memberships" : {
         "count" : 940
      },
      "name" : "Tech4Good Tampa",
      "urlname" : "Tech4Good-Tampa"
   }
}
```
