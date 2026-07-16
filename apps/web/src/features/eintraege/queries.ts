import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateEintragRequest,
  CreateKommentarRequest,
  EintragFilter,
  UpdateEintragRequest,
} from "@schichtbuch/shared";
import {
  addKommentar,
  createEintrag,
  fetchEintrag,
  fetchEintraege,
  fetchFormOptions,
  updateEintrag,
} from "./api";

const EINTRAEGE_KEY = ["eintraege"];

export function useEintraege(filter: EintragFilter) {
  return useQuery({
    queryKey: [...EINTRAEGE_KEY, filter],
    queryFn: () => fetchEintraege(filter),
  });
}

export function useEintrag(id: string | undefined) {
  return useQuery({
    queryKey: [...EINTRAEGE_KEY, "detail", id],
    queryFn: () => fetchEintrag(id as string),
    enabled: !!id,
  });
}

export function useFormOptions() {
  return useQuery({ queryKey: ["eintrag-form-options"], queryFn: fetchFormOptions });
}

export function useCreateEintrag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateEintragRequest) => createEintrag(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EINTRAEGE_KEY }),
  });
}

export function useUpdateEintrag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEintragRequest }) =>
      updateEintrag(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EINTRAEGE_KEY }),
  });
}

export function useAddKommentar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateKommentarRequest }) =>
      addKommentar(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EINTRAEGE_KEY }),
  });
}
