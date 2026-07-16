import { EintragStatus, PRIORITAET_LABELS, Prioritaet, STATUS_LABELS } from "@schichtbuch/shared";
import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";

const PRIORITAET_VARIANT: Record<Prioritaet, BadgeProps["variant"]> = {
  [Prioritaet.NIEDRIG]: "secondary",
  [Prioritaet.NORMAL]: "outline",
  [Prioritaet.HOCH]: "warning",
  [Prioritaet.KRITISCH]: "destructive",
};

const STATUS_VARIANT: Record<EintragStatus, BadgeProps["variant"]> = {
  [EintragStatus.OFFEN]: "warning",
  [EintragStatus.IN_BEARBEITUNG]: "default",
  [EintragStatus.ERLEDIGT]: "success",
  [EintragStatus.VERSCHOBEN]: "secondary",
};

export function PrioritaetBadge({ prioritaet }: { prioritaet: Prioritaet }) {
  return <Badge variant={PRIORITAET_VARIANT[prioritaet]}>{PRIORITAET_LABELS[prioritaet]}</Badge>;
}

export function StatusBadge({ status }: { status: EintragStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
