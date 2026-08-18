import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSchichtbuchSpalten, updateSchichtbuchSpalten } from "./api";

const SPALTEN_KEY = ["einstellungen", "schichtbuch-spalten"];

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
