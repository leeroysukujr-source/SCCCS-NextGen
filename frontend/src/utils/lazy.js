import { lazy } from 'react';

/**
 * Enhanced React.lazy with retry logic for failed dynamic imports.
 * Useful for handling stale chunks after a new deployment.
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasAlreadyBeenReloaded = sessionStorage.getItem('page-reloaded');

    try {
      const component = await componentImport();
      // Reset the reload flag on successful load
      sessionStorage.setItem('page-reloaded', 'false');
      return component;
    } catch (error) {
      if (pageHasAlreadyBeenReloaded !== 'true') {
        // First try: Reload the page
        sessionStorage.setItem('page-reloaded', 'true');
        window.location.reload();
        return;
      }

      // If we already reloaded and it still fails, bubble up the error
      throw error;
    }
  });
