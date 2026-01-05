import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type UpdateCaseRequest, type CreateNoteRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useRole } from "./use-role.tsx";

interface CaseFilters {
  search?: string;
  status?: string;
  dcaId?: string;
}

export function useCases(filters: CaseFilters = {}) {
  const { role, selectedDcaId } = useRole();
  
  // Construct query key that includes filters to trigger re-fetches
  const queryKey = [api.cases.list.path, filters, role, selectedDcaId];
  
  return useQuery({
    queryKey,
    refetchInterval: 5000, // Refresh case list every 5 seconds
    queryFn: async () => {
      // Build URL with query params manually since buildUrl only handles path params
      const url = new URL(api.cases.list.path, window.location.origin);
      if (filters.search) url.searchParams.set("search", filters.search);
      if (filters.status && filters.status !== "all") url.searchParams.set("status", filters.status);
      
      const dcaId = role === "dca" ? selectedDcaId?.toString() : filters.dcaId;
      if (dcaId) url.searchParams.set("dcaId", dcaId);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch cases");
      return api.cases.list.responses[200].parse(await res.json());
    },
  });
}

export function useCase(id: number) {
  return useQuery({
    queryKey: [api.cases.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.cases.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch case details");
      return api.cases.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateCaseRequest) => {
      const url = buildUrl(api.cases.update.path, { id });
      const res = await fetch(url, {
        method: api.cases.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("Failed to update case");
      return api.cases.update.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.cases.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.cases.get.path, data.id] });
      toast({
        title: "Case Updated",
        description: "Changes have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ caseId, note }: { caseId: number; note: string }) => {
      const url = buildUrl(api.notes.create.path, { id: caseId });
      const res = await fetch(url, {
        method: api.notes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });

      if (!res.ok) throw new Error("Failed to add note");
      return api.notes.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.cases.get.path, variables.caseId] });
      toast({
        title: "Note Added",
        description: "Audit trail has been updated.",
      });
    },
  });
}

export function useImportCases() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.cases.import.path, {
        method: api.cases.import.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Import failed");
      return api.cases.import.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.cases.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.uploadLogs.list.path] });
      toast({
        title: "Import Successful",
        description: `Processed ${data.processed} cases successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUploadLogs() {
  return useQuery({
    queryKey: [api.uploadLogs.list.path],
    queryFn: async () => {
      const res = await fetch(api.uploadLogs.list.path);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.uploadLogs.list.responses[200].parse(await res.json());
    },
  });
}
