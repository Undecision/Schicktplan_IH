import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GeneriereUebergabenMehrereRequest,
  UebergabeFilter,
  UpdateUebergabeRequest,
} from "@schichtbuch/shared";
import {
  deleteUebergabe,
  fetchBenutzerFuerGewerk,
  fetchUebergabe,
  fetchUebergabeHistorie,
  fetchUebergaben,
  generiereUebergabenMehrere,
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

export function useGeneriereUebergabenMehrere() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: GeneriereUebergabenMehrereRequest) => generiereUebergabenMehrere(payload),
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

export function useDeleteUebergabe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUebergabe(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: UEBERGABEN_KEY }),
  });
}

export function useUebergabeHistorie(id: string | undefined) {
  return useQuery({
    queryKey: [...UEBERGABEN_KEY, "historie", id],
    queryFn: () => fetchUebergabeHistorie(id as string),
    enabled: !!id,
  });
}

export function useBenutzerFuerGewerk(gewerkId: string | undefined) {
  return useQuery({
    queryKey: ["benutzer-auswahl", { gewerkId: gewerkId ?? null }],
    queryFn: () => fetchBenutzerFuerGewerk(gewerkId),
    enabled: !!gewerkId,
  });
}
