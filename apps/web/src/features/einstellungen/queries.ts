import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchIntegrationLinks,
  fetchSchichtbuchSpalten,
  updateIntegrationLinks,
  updateSchichtbuchSpalten,
} from "./api";

const SPALTEN_KEY = ["einstellungen", "schichtbuch-spalten"];
const INTEGRATION_KEY = ["einstellungen", "integration-links"];

export function useSchichtbuchSpalten() {
  return useQuery({
    queryKey: SPALTEN_KEY,
    queryFn: fetchSchichtbuchSpalten,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSchichtbuchSpalten() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reihenfolge: string[]) => updateSchichtbuchSpalten(reihenfolge),
    onSuccess: (data) => queryClient.setQueryData(SPALTEN_KEY, data),
  });
}

export function useIntegrationLinks() {
  return useQuery({
    queryKey: INTEGRATION_KEY,
    queryFn: fetchIntegrationLinks,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateIntegrationLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateIntegrationLinks,
    onSuccess: (data) => queryClient.setQueryData(INTEGRATION_KEY, data),
  });
}
