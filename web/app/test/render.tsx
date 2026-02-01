import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';

export { screen, within, waitFor, act } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

interface RenderWithRouterOptions extends Omit<RenderOptions, 'wrapper'> {
  initialPath?: string;
  routePattern?: string;
}

/**
 * Render a component wrapped in a React Router context.
 * Useful for components that use <Link>, useLocation, etc.
 */
export function renderWithRouter(
  ui: React.ReactElement,
  { initialPath = '/', routePattern = '/', ...options }: RenderWithRouterOptions = {},
) {
  const router = createMemoryRouter(
    [{ path: routePattern, element: ui }],
    { initialEntries: [initialPath] },
  );

  return render(<RouterProvider router={router} />, options);
}
