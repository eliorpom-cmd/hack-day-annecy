import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Retry brief network drops (e.g. server restarting) instead of blanking the page.
  const isNetworkError = (e: unknown) => e instanceof TypeError && /fetch|network/i.test(e.message);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, error) => (isNetworkError(error) ? count < 4 : count < 1),
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
