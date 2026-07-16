import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GeneriereUebergabeRequest,
  UebergabeFilter,
  UpdateUebergabeRequest,
} from "@schichtbuch/shared";
import {
  fetchUebergabe,
  fetchUebergaben,
  generiereUebergabe,
  uebergebenUebergabe,
  updateUebergabe,
} from "./api";

const UEBERGABEN_KEY = ["uebergaben"];

export function useUebergaben(filter: UebergabeFilter) {
  return useQuery({
    queryKey: [...UEBERGABEN_KEY, filter],
    queryFn: () => fetchUebergaben(filter),
  });
}

export function useUebergabe(id: string | undefined) {
  return useQuery({
    queryKey: [...UEBERGABEN_KEY, "detail", id],
    queryFn: () => fetchUebergabe(id as string),
    enabled: !!id,
  });
}

export function useGeneriereUebergabe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeneriereUebergabeRequest) => generiereUebergabe(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: UEBERGABEN_KEY }),
  });
}

export function useUpdateUebergabe(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateUebergabeRequest) => updateUebergabe(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: UEBERGABEN_KEY }),
  });
}

export function useUebergeben(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uebernommenVonId: string | null) => uebergebenUebergabe(id, uebernommenVonId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: UEBERGABEN_KEY }),
  });
}
