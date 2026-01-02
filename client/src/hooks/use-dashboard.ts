import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useRole } from "./use-role";

export function useDashboardStats() {
  const { role, selectedDcaId } = useRole();
  
  return useQuery({
    queryKey: [api.dashboard.stats.path, role, selectedDcaId],
    queryFn: async () => {
      const url = new URL(api.dashboard.stats.path, window.location.origin);
      if (role === "dca" && selectedDcaId) {
        url.searchParams.set("dcaId", selectedDcaId.toString());
      }
      
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return await res.json();
    },
  });
}
