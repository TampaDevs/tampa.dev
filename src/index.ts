import { createApp, addOpenAPIRoutes } from './app.js';
import { registerEventRoutes } from './routes/events.js';
import { registerSchemaRoutes } from './routes/schemas.js';
import { registerFeedRoutes } from './routes/feeds.js';
import { registerWidgetRoutes } from './routes/widgets.js';
import { registerPageRoutes } from './routes/pages.js';

// Create Hono app
const app = createApp();

// Register all route modules
registerEventRoutes(app);
registerSchemaRoutes(app);
registerFeedRoutes(app);
registerWidgetRoutes(app);
registerPageRoutes(app);

// Add OpenAPI documentation routes
addOpenAPIRoutes(app);

// Root path redirects to API documentation
app.get('/', (c) => c.redirect('/docs'));

// Export the app as the default Cloudflare Workers handler
export default app;
