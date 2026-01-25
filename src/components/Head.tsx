/**
 * Head component - combines global metadata, analytics, and styles
 */
export function Head() {
  return (
    <>
      {/* Global metadata */}
      <title>Tampa Devs Events API</title>
      <link rel="icon" type="image/png" href="https://tampa.dev/images/favicons/favicon-32x32.png" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="Upcoming events from software development and technology meetups in Tampa Bay." />
      <meta charset="UTF-8" />

      {/* Analytics */}
      <script async src="https://www.googletagmanager.com/gtag/js?id=G-VV1YTRRM50"></script>
      <script dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-VV1YTRRM50');
        `
      }} />
      <script dangerouslySetInnerHTML={{
        __html: `
          !function(){var i="analytics",analytics=window[i]=window[i]||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","screen","once","off","on","addSourceMiddleware","addIntegrationMiddleware","setAnonymousId","addDestinationMiddleware","register"];analytics.factory=function(e){return function(){if(window[i].initialized)return window[i][e].apply(window[i],arguments);var n=Array.prototype.slice.call(arguments);if(["track","screen","alias","group","page","identify"].indexOf(e)>-1){var c=document.querySelector("link[rel='canonical']");n.push({__t:"bpc",c:c&&c.getAttribute("href")||void 0,p:location.pathname,u:location.href,s:location.search,t:document.title,r:document.referrer})}n.unshift(e);analytics.push(n);return analytics}};for(var n=0;n<analytics.methods.length;n++){var key=analytics.methods[n];analytics[key]=analytics.factory(key)}analytics.load=function(key,n){var t=document.createElement("script");t.type="text/javascript";t.async=!0;t.setAttribute("data-global-segment-analytics-key",i);t.src="https://cdn.segment.com/analytics.js/v1/" + key + "/analytics.min.js";var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r);analytics._loadOptions=n};analytics._writeKey="0VZjlrmB01olqD95p6rMzcBlASBDHM1u";;analytics.SNIPPET_VERSION="5.2.0";
          analytics.load("0VZjlrmB01olqD95p6rMzcBlASBDHM1u");
          analytics.page();
          }}();
        `
      }} />
      <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "d54a04b9251d46f5a5d443cc90a02e8e"}'></script>

      {/* Tailwind CSS */}
      <script src="https://cdn.tailwindcss.com"></script>
    </>
  );
}
