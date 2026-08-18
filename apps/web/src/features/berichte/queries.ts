import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BerichtFilter,
  GeneriereBerichtRequest,
  UpdateBerichtRequest,
} from "@schichtbuch/shared";
import {
  deleteBericht,
  fetchBericht,
  fetchBerichtHistorie,
  fetchBerichte,
  freigebenBericht,
  generiereBerichte,
  updateBericht,
} from "./api";

const BERICHTE_KEY = ["berichte"];

export function useBerichte(filter: BerichtFilter) {
  return useQuery({
    queryKey: [...BERICHTE_KEY, filter],
    queryFn: () => fetchBerichte(filter),
  });
}

export function useBericht(id: string | undefined) {
  return useQuery({
    queryKey: [...BERICHTE_KEY, "detail", id],
    queryFn: () => fetchBericht(id as string),
    enabled: !!id,
  });
}

export function useGeneriereBerichte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeneriereBerichtRequest) => generiereBerichte(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BERICHTE_KEY }),
  });
}

export function useUpdateBericht(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBerichtRequest) => updateBericht(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BERICHTE_KEY }),
  });
}

export function useFreigebenBericht(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => freigebenBericht(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BERICHTE_KEY }),
  });
}

export function useDeleteBericht() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBericht(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BERICHTE_KEY }),
  });
}

export function useBerichtHistorie(id: string | undefined) {
  return useQuery({
    queryKey: [...BERICHTE_KEY, "historie", id],
    queryFn: () => fetchBerichtHistorie(id as string),
    enabled: !!id,
  });
}
