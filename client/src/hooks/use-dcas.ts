import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { type CreateDcaRequest } from "@shared/schema";

export function useDcas() {
  return useQuery({
    queryKey: [api.dcas.list.path],
    queryFn: async () => {
      const res = await fetch(api.dcas.list.path);
      if (!res.ok) throw new Error("Failed to fetch DCAs");
      return api.dcas.list.responses[200].parse(await res.json());
    },
  });
}

export function useDca(id: number) {
  return useQuery({
    queryKey: [api.dcas.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.dcas.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch DCA");
      return api.dcas.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateDca() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateDcaRequest) => {
      const res = await fetch(api.dcas.create.path, {
        method: api.dcas.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.dcas.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create DCA");
      }
      
      return api.dcas.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dcas.list.path] });
      toast({
        title: "DCA Created",
        description: "New agency has been successfully onboarded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
