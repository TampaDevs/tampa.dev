/**
 * Shared page layout wrapper
 */
import type { Child } from 'hono/jsx';
import { Head } from './Head.js';

interface PageLayoutProps {
  children: Child;
  bodyClass?: string;
}

export function PageLayout({ children, bodyClass }: PageLayoutProps) {
  return (
    <html>
      <head>
        <Head />
      </head>
      <body class={bodyClass}>
        {children}
      </body>
    </html>
  );
}
