import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArbeitsanweisungFilter, CreateArbeitsanweisungRequest } from "@schichtbuch/shared";
import {
  createAnweisung,
  deleteAnweisung,
  fetchAnweisungen,
  fetchQuittungen,
  fetchUngelesen,
  quittiereAnweisung,
} from "./api";

const ANWEISUNGEN_KEY = ["arbeitsanweisungen"];

export function useAnweisungen(filter: ArbeitsanweisungFilter = {}) {
  return useQuery({
    queryKey: [...ANWEISUNGEN_KEY, filter],
    queryFn: () => fetchAnweisungen(filter),
  });
}

export function useUngelesenAnweisungen(enabled = true) {
  return useQuery({
    queryKey: [...ANWEISUNGEN_KEY, "ungelesen"],
    queryFn: fetchUngelesen,
    enabled,
  });
}

export function useQuittungen(id: string | undefined) {
  return useQuery({
    queryKey: [...ANWEISUNGEN_KEY, "quittungen", id],
    queryFn: () => fetchQuittungen(id as string),
    enabled: !!id,
  });
}

export function useCreateAnweisung() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      payload,
      file,
    }: {
      payload: CreateArbeitsanweisungRequest;
      file: File | null;
    }) => createAnweisung(payload, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ANWEISUNGEN_KEY }),
  });
}

export function useQuittieren() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => quittiereAnweisung(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ANWEISUNGEN_KEY }),
  });
}

export function useDeleteAnweisung() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnweisung(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ANWEISUNGEN_KEY }),
  });
}
