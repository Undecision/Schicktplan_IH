import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateRoleRequest, UpdateRoleRequest } from "@schichtbuch/shared";
import { createRole, deleteRole, fetchRoles, updateRole } from "./roles-api";

const ROLES_KEY = ["roles"];

export function useRoles(enabled = true) {
  return useQuery({ queryKey: ROLES_KEY, queryFn: fetchRoles, enabled });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRoleRequest) => createRole(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRoleRequest }) =>
      updateRole(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}
