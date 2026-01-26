import { createApp, addOpenAPIRoutes, type Env } from './app.js';
import { registerEventRoutes } from './routes/events.js';
import { registerSchemaRoutes } from './routes/schemas.js';
import { registerFeedRoutes } from './routes/feeds.js';
import { registerWidgetRoutes } from './routes/widgets.js';
import { registerPageRoutes } from './routes/pages.js';
import { registerAdminRoutes } from './routes/admin.js';
import { handleScheduled } from './scheduled/handler.js';

// Create Hono app
const app = createApp();

// Register all route modules
registerEventRoutes(app);
registerSchemaRoutes(app);
registerFeedRoutes(app);
registerWidgetRoutes(app);
registerPageRoutes(app);
registerAdminRoutes(app);

// Add OpenAPI documentation routes
addOpenAPIRoutes(app);

// Root path redirects to API documentation
app.get('/', (c) => c.redirect('/docs'));

// Export Cloudflare Workers handlers
export default {
  // HTTP request handler
  fetch: app.fetch,

  // Scheduled (cron) handler for event aggregation
  scheduled: handleScheduled,
} satisfies ExportedHandler<Env>;
