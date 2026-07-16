import { useQuery } from "@tanstack/react-query";
import type { AuswertungFilter } from "@schichtbuch/shared";
import { fetchAuswertung } from "./api";

export function useAuswertung(filter: AuswertungFilter | null) {
  return useQuery({
    queryKey: ["reporting", "auswertung", filter],
    queryFn: () => fetchAuswertung(filter as AuswertungFilter),
    enabled: !!filter,
  });
}
