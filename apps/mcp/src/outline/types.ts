export type SortDirection = "ASC" | "DESC";

export type DocumentStatus = "draft" | "archived" | "published";

export type SearchDateFilter = "day" | "week" | "month" | "year";

export type SearchSort = "relevance" | "createdAt" | "updatedAt" | "title";

export type Pagination = {
  offset: number;
  limit: number;
  total?: number;
};

export type Policy = {
  id: string;
  abilities: Record<string, boolean | string[]>;
};

export type Permission = "read" | "read_write";

export type DocumentDataAttribute = {
  dataAttributeId: string;
  value: string | number | boolean;
  updatedAt?: string;
};

export type OutlineCollection = {
  id: string;
  name: string;
  description?: string | null;
  permission?: Permission;
  icon?: string | null;
  color?: string | null;
  sharing?: boolean;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
};

export type OutlineDocument = {
  id: string;
  urlId?: string;
  title: string;
  text?: string;
  collectionId?: string;
  parentDocumentId?: string | null;
  template?: boolean;
  templateId?: string | null;
  revision?: number;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
  dataAttributes?: DocumentDataAttribute[] | null;
};

export type CollectionDocumentNode = {
  id: string;
  title: string;
  children?: CollectionDocumentNode[];
  parentDocumentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SearchHit = {
  context?: string;
  ranking?: number;
  document: OutlineDocument;
};

export type Revision = {
  id: string;
  documentId: string;
  title: string;
  text: string;
  createdAt: string;
};

export type OutlineEvent = {
  id: string;
  name: string;
  modelId?: string;
  actorId?: string;
  collectionId?: string;
  documentId?: string;
  createdAt: string;
  data?: Record<string, unknown>;
};

export type OutlineComment = {
  id: string;
  documentId?: string;
  parentCommentId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  resolvedAt?: string | null;
  data?: Record<string, unknown>;
  userId?: string;
  actorId?: string;
};

export type UserSummary = {
  id: string;
  name?: string;
  email?: string;
};

export type GroupSummary = {
  id: string;
  name?: string;
};

export type Membership = {
  id?: string;
  userId?: string;
  groupId?: string;
  permission?: Permission;
  user?: UserSummary;
  group?: GroupSummary;
};

export type FileOperationType = "import" | "export";
export type FileOperationState = "creating" | "uploading" | "complete" | "error" | "expired";

export type FileOperation = {
  id: string;
  type: FileOperationType;
  state: FileOperationState;
  size?: number;
  createdAt?: string;
};

export type AiAnswerPayload = Record<string, unknown>;

export type EnvelopeResponse<T> = {
  data: T;
  pagination?: Pagination;
  policies?: Policy[];
};

export type CollectionsListResponse = EnvelopeResponse<OutlineCollection[]>;

export type DocumentsListResponse = EnvelopeResponse<OutlineDocument[]>;

export type SearchDocumentsResponse = EnvelopeResponse<SearchHit[]>;

export type RevisionsListResponse = EnvelopeResponse<Revision[]>;

export type EventsListResponse = EnvelopeResponse<OutlineEvent[]>;

export type CommentsListResponse = EnvelopeResponse<OutlineComment[]>;

export type MembershipsListResponse = EnvelopeResponse<Membership[]>;

export type FileOperationsListResponse = EnvelopeResponse<FileOperation[]>;

export type CollectionTreeResponse = EnvelopeResponse<CollectionDocumentNode[]>;
