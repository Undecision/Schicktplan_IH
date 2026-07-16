import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateUserRequest,
  ResetPasswordRequest,
  UpdateUserRequest,
} from "@schichtbuch/shared";
import {
  anonymisierenPerson,
  createUser,
  deactivateUser,
  fetchGewerke,
  fetchUsers,
  resetUserPassword,
  updateUser,
} from "./api";

const USERS_KEY = ["admin", "users"];
const GEWERKE_KEY = ["admin", "gewerke"];

export function useUsers() {
  return useQuery({ queryKey: USERS_KEY, queryFn: fetchUsers });
}

export function useAnonymisierenPerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => anonymisierenPerson(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useGewerke() {
  return useQuery({ queryKey: GEWERKE_KEY, queryFn: fetchGewerke });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserRequest) => createUser(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserRequest }) =>
      updateUser(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: USERS_KEY });
      const previous = queryClient.getQueryData(USERS_KEY);
      queryClient.setQueryData(USERS_KEY, (users: unknown) =>
        Array.isArray(users)
          ? users.map((user) => (user.id === id ? { ...user, status: "DEAKTIVIERT" } : user))
          : users,
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(USERS_KEY, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResetPasswordRequest }) =>
      resetUserPassword(id, payload),
  });
}
