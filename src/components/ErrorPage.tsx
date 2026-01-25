/**
 * Error page component
 */
import { PageLayout } from './PageLayout.js';

interface ErrorPageProps {
  errorStatus: number | string;
  errorMessage: string;
}

export function ErrorPage({ errorStatus, errorMessage }: ErrorPageProps) {
  return (
    <PageLayout>
      <h2 id="error-message-head">{errorStatus} - {errorMessage}</h2>

      <h5 id="error-message-description">
        Need help? Check out our{' '}
        <a href="https://github.com/TampaDevs/events.api.tampa.dev">documentation.</a>
      </h5>

      <p id="powered-by">
        <a href="https://www.tampadevs.com/">Tampa Devs</a> Events API Widget - Powered by{' '}
        <a href="https://github.com/TampaDevs/events.api.tampa.dev">Cloudflare</a>
      </p>
    </PageLayout>
  );
}
