import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createStammdatum, fetchStammdaten, updateStammdatum, type StammdatumRow } from "./api";

function listKey(endpoint: string, includeInactive: boolean) {
  return ["stammdaten", endpoint, { includeInactive }] as const;
}

export function useStammdaten(endpoint: string, includeInactive: boolean) {
  return useQuery({
    queryKey: listKey(endpoint, includeInactive),
    queryFn: () => fetchStammdaten(endpoint, includeInactive),
  });
}

export function useCreateStammdatum(endpoint: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createStammdatum(endpoint, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stammdaten", endpoint] }),
  });
}

export function useUpdateStammdatum(endpoint: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      updateStammdatum(endpoint, id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["stammdaten", endpoint] }),
  });
}

export type { StammdatumRow };
