/** Basis-Felder, die alle persistierten Entitäten gemeinsam haben (siehe Rahmenbedingungen §0). */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface SoftDeletableEntity extends BaseEntity {
  deletedAt: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
  requestId?: string;
}
