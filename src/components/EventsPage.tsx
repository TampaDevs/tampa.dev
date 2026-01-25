/**
 * Events HTML page component
 */
import type { Event } from '../../models/index.js';
import { PageLayout } from './PageLayout.js';
import { EmptyState } from './EventCard.js';
import { getPhotoUrl, formatDate, renderLongDescription } from './helpers.js';

interface EventsPageProps {
  events: Event[];
}

export function EventsPage({ events }: EventsPageProps) {
  return (
    <PageLayout bodyClass="bg-gray-50 text-gray-800 font-sans">
      <div class="max-w-4xl mx-auto py-8 px-4">
        <div class="text-center mb-12">
          <h1 class="text-4xl font-semibold">Upcoming Events</h1>
          <h4 class="mt-2 text-1xl font-semibold">
            <a class="text-blue-500 hover:text-blue-700" href="https://tampa.dev/">
              Back to All Meetups
            </a>
          </h4>
        </div>

        {events.length > 0 ? (
          <div class="space-y-8">
            {events.map((event) => {
              const photoUrl = getPhotoUrl(event);
              return (
                <div class="bg-white shadow rounded-lg p-6" key={event.id}>
                  <div class="w-11/12" id={event.group.urlname}>
                    <h2 class="text-2xl mb-1 font-semibold">
                      {event.group.name} - {event.title}
                    </h2>
                    <h3 class="text-lg mb-2 font-bold">
                      {formatDate(event.dateTime)} &bull; {event.rsvpCount} RSVPs
                    </h3>
                    <h4 class="text-xs w-1/3 font-bold">
                      {event.googleMapsUrl ? (
                        <a class="text-blue-500 hover:text-blue-700" href={event.googleMapsUrl}>
                          {event.address}
                        </a>
                      ) : (
                        event.address
                      )}
                    </h4>
                  </div>

                  <div class="flex mt-8 justify-center items-center">
                    {photoUrl && (
                      <img
                        class="rounded-md drop-shadow-sm"
                        src={photoUrl}
                        alt={event.title}
                      />
                    )}
                  </div>

                  <div class="flex mb-4 mt-6 justify-center items-center">
                    <a href={event.eventUrl}>
                      <button class="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-2 px-4 border border-blue-500 hover:border-transparent rounded">
                        RSVP
                      </button>
                    </a>
                  </div>

                  <div class="flex flex-col justify-center items-center">
                    <p
                      class="mt-4 mb-10 w-11/12"
                      dangerouslySetInnerHTML={{ __html: renderLongDescription(event.description) }}
                    />
                    <a class="text-blue-500 hover:text-blue-700 text-xs" href={event.eventUrl}>
                      View on Meetup.com
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </PageLayout>
  );
}
