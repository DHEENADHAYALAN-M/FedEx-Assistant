import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useDashboardStats() {
  return useQuery({
    queryKey: [api.dashboard.stats.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.stats.path);
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      // The API returns typed data, but we can't parse it with a runtime schema here 
      // because the schema for stats is defined as a TS type, not a Zod schema in the manifest provided.
      // We assume it matches DashboardStats type.
      return await res.json();
    },
  });
}
