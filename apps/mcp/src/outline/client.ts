import type { AppConfig } from "../config.js";
import type {
  CommentsListResponse,
  CollectionsListResponse,
  DocumentDataAttribute,
  DocumentStatus,
  DocumentsListResponse,
  EventsListResponse,
  FileOperation,
  FileOperationsListResponse,
  MembershipsListResponse,
  OutlineCollection,
  OutlineComment,
  OutlineDocument,
  OutlineEvent,
  Permission,
  Revision,
  RevisionsListResponse,
  SearchDateFilter,
  SearchDocumentsResponse,
  SearchHit,
  SearchSort,
  SortDirection
} from "./types.js";

type ApiEnvelope<T> = {
  ok?: boolean;
  success?: boolean;
  data?: T;
  pagination?: {
    offset: number;
    limit: number;
    total?: number;
  };
  policies?: Array<{
    id: string;
    abilities: Record<string, boolean | string[]>;
  }>;
  error?: string;
  message?: string;
  status?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => typeof entry !== "undefined"));
}

export class OutlineApiError extends Error {
  readonly status: number;
  readonly code: "RATE_LIMITED" | "UPSTREAM_ERROR";

  constructor(message: string, status: number, code: "RATE_LIMITED" | "UPSTREAM_ERROR") {
    super(message);
    this.name = "OutlineApiError";
    this.status = status;
    this.code = code;
  }
}

export class OutlineClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;
  private readonly retryCount: number;

  constructor(config: AppConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.requestTimeoutMs = config.requestTimeoutMs;
    this.retryCount = config.retryCount;
  }

  async listCollections(params: {
    limit?: number;
    offset?: number;
    query?: string;
    sort?: string;
    direction?: SortDirection;
    statusFilter?: string;
  }): Promise<CollectionsListResponse> {
    const response = await this.request<OutlineCollection[]>("collections.list", stripUndefined(params));
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async getCollection(params: { id: string }): Promise<OutlineCollection> {
    const response = await this.request<OutlineCollection>("collections.info", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError("Outline API response missing collection payload", 502, "UPSTREAM_ERROR");
    }
    return response.data;
  }

  async createCollection(params: {
    name: string;
    description?: string;
    permission?: Permission;
    icon?: string;
    color?: string;
    sharing?: boolean;
  }): Promise<OutlineCollection> {
    const response = await this.request<OutlineCollection>("collections.create", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError(
        "Outline API response missing created collection payload",
        502,
        "UPSTREAM_ERROR"
      );
    }
    return response.data;
  }

  async updateCollection(params: {
    id: string;
    name?: string;
    description?: string;
    permission?: Permission;
    icon?: string;
    color?: string;
    sharing?: boolean;
  }): Promise<OutlineCollection> {
    const response = await this.request<OutlineCollection>("collections.update", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError(
        "Outline API response missing updated collection payload",
        502,
        "UPSTREAM_ERROR"
      );
    }
    return response.data;
  }

  async deleteCollection(params: { id: string }): Promise<{ success: boolean }> {
    const response = await this.request<unknown>("collections.delete", stripUndefined(params));
    return {
      success: response.success === true || response.ok === true
    };
  }

  async getDocument(params: { id?: string; shareId?: string }): Promise<OutlineDocument> {
    const response = await this.request<OutlineDocument>("documents.info", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError("Outline API response missing document payload", 502, "UPSTREAM_ERROR");
    }
    return response.data;
  }

  async listDocuments(params: {
    collectionId?: string;
    parentDocumentId?: string;
    userId?: string;
    template?: boolean;
    statusFilter?: DocumentStatus[];
    limit?: number;
    offset?: number;
    sort?: string;
    direction?: SortDirection;
  }): Promise<DocumentsListResponse> {
    const response = await this.request<OutlineDocument[]>("documents.list", stripUndefined(params));
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async searchDocuments(params: {
    query: string;
    collectionId?: string;
    documentId?: string;
    userId?: string;
    statusFilter?: DocumentStatus[];
    dateFilter?: SearchDateFilter;
    sort?: SearchSort;
    direction?: SortDirection;
    snippetMinWords?: number;
    snippetMaxWords?: number;
    limit?: number;
    offset?: number;
  }): Promise<SearchDocumentsResponse> {
    const response = await this.request<SearchHit[]>("documents.search", stripUndefined(params));
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async createDocument(params: {
    title?: string;
    collectionId?: string;
    parentDocumentId?: string;
    templateId?: string;
    template?: boolean;
    text?: string;
    publish?: boolean;
    dataAttributes?: DocumentDataAttribute[];
  }): Promise<OutlineDocument> {
    const response = await this.request<OutlineDocument>("documents.create", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError("Outline API response missing created document payload", 502, "UPSTREAM_ERROR");
    }
    return response.data;
  }

  async updateDocument(params: {
    id: string;
    title?: string;
    text?: string;
    editMode?: "append" | "prepend" | "replace";
    publish?: boolean;
    collectionId?: string;
    dataAttributes?: DocumentDataAttribute[];
  }): Promise<OutlineDocument> {
    const response = await this.request<OutlineDocument>("documents.update", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError("Outline API response missing updated document payload", 502, "UPSTREAM_ERROR");
    }
    return response.data;
  }

  async moveDocument(params: {
    id: string;
    collectionId?: string;
    parentDocumentId?: string;
    index?: number;
  }): Promise<OutlineDocument> {
    const response = await this.request<OutlineDocument>("documents.move", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError("Outline API response missing moved document payload", 502, "UPSTREAM_ERROR");
    }
    return response.data;
  }

  async deleteDocument(params: {
    id: string;
    permanent?: boolean;
  }): Promise<{ success: boolean; document?: OutlineDocument }> {
    const response = await this.request<OutlineDocument>("documents.delete", stripUndefined(params));
    return {
      success: response.success === true || response.ok === true || typeof response.data !== "undefined",
      document: response.data
    };
  }

  async listRevisions(params: {
    documentId: string;
    limit?: number;
    offset?: number;
    sort?: string;
    direction?: SortDirection;
  }): Promise<RevisionsListResponse> {
    const response = await this.request<RevisionsListResponse["data"]>("revisions.list", stripUndefined(params));
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async getRevision(params: { id: string }): Promise<Revision> {
    const response = await this.request<Revision>("revisions.info", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError("Outline API response missing revision payload", 502, "UPSTREAM_ERROR");
    }
    return response.data;
  }

  async listEvents(params: {
    actorId?: string;
    documentId?: string;
    collectionId?: string;
    name?: string;
    auditLog?: boolean;
    limit?: number;
    offset?: number;
    sort?: string;
    direction?: SortDirection;
  }): Promise<EventsListResponse> {
    const response = await this.request<OutlineEvent[]>("events.list", stripUndefined(params));
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async listDocumentUsers(params: {
    id: string;
    query?: string;
    userId?: string;
  }): Promise<MembershipsListResponse> {
    const response = await this.request<MembershipsListResponse["data"]>("documents.users", stripUndefined(params));
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async listDocumentMemberships(params: {
    id: string;
    query?: string;
    permission?: Permission;
  }): Promise<MembershipsListResponse> {
    const response = await this.request<MembershipsListResponse["data"]>(
      "documents.memberships",
      stripUndefined(params)
    );
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async listDocumentGroupMemberships(params: {
    id: string;
    query?: string;
    permission?: Permission;
    limit?: number;
    offset?: number;
    direction?: SortDirection;
  }): Promise<MembershipsListResponse> {
    const response = await this.request<MembershipsListResponse["data"]>(
      "documents.group_memberships",
      stripUndefined(params)
    );
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async addDocumentUser(params: { id: string; userId: string; permission?: Permission }): Promise<unknown> {
    const response = await this.request<unknown>("documents.add_user", stripUndefined(params));
    return response.data ?? { ok: true };
  }

  async removeDocumentUser(params: { id: string; userId: string }): Promise<unknown> {
    const response = await this.request<unknown>("documents.remove_user", stripUndefined(params));
    return response.data ?? { ok: true };
  }

  async addDocumentGroup(params: { id: string; groupId: string; permission?: Permission }): Promise<unknown> {
    const response = await this.request<unknown>("documents.add_group", stripUndefined(params));
    return response.data ?? { ok: true };
  }

  async removeDocumentGroup(params: { id: string; groupId: string }): Promise<unknown> {
    const response = await this.request<unknown>("documents.remove_group", stripUndefined(params));
    return response.data ?? { ok: true };
  }

  async listCollectionMemberships(params: {
    id: string;
    query?: string;
    permission?: Permission;
    limit?: number;
    offset?: number;
    direction?: SortDirection;
  }): Promise<MembershipsListResponse> {
    const response = await this.request<MembershipsListResponse["data"]>(
      "collections.memberships",
      stripUndefined(params)
    );
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async listCollectionGroupMemberships(params: {
    id: string;
    query?: string;
    permission?: Permission;
    limit?: number;
    offset?: number;
    direction?: SortDirection;
  }): Promise<MembershipsListResponse> {
    const response = await this.request<MembershipsListResponse["data"]>(
      "collections.group_memberships",
      stripUndefined(params)
    );
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async addCollectionUser(params: { id: string; userId: string; permission?: Permission }): Promise<unknown> {
    const response = await this.request<unknown>("collections.add_user", stripUndefined(params));
    return response.data ?? { ok: true };
  }

  async removeCollectionUser(params: { id: string; userId: string }): Promise<unknown> {
    const response = await this.request<unknown>("collections.remove_user", stripUndefined(params));
    return response.data ?? { ok: true };
  }

  async addCollectionGroup(params: { id: string; groupId: string; permission?: Permission }): Promise<unknown> {
    const response = await this.request<unknown>("collections.add_group", stripUndefined(params));
    return response.data ?? { ok: true };
  }

  async removeCollectionGroup(params: { id: string; groupId: string }): Promise<unknown> {
    const response = await this.request<unknown>("collections.remove_group", stripUndefined(params));
    return response.data ?? { ok: true };
  }

  async createTemplateFromDocument(params: {
    id: string;
    publish: boolean;
    collectionId?: string;
  }): Promise<OutlineDocument> {
    const response = await this.request<OutlineDocument>("documents.templatize", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError("Outline API response missing templated document payload", 502, "UPSTREAM_ERROR");
    }
    return response.data;
  }

  async listComments(params: {
    documentId?: string;
    collectionId?: string;
    includeAnchorText?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<CommentsListResponse> {
    const response = await this.request<CommentsListResponse["data"]>("comments.list", stripUndefined(params));
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async getComment(params: { id: string; includeAnchorText?: boolean }): Promise<OutlineComment> {
    const response = await this.request<OutlineComment>("comments.info", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError("Outline API response missing comment payload", 502, "UPSTREAM_ERROR");
    }
    return response.data;
  }

  async createComment(params: {
    documentId: string;
    parentCommentId?: string;
    data: Record<string, unknown>;
  }): Promise<OutlineComment> {
    const response = await this.request<OutlineComment>("comments.create", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError("Outline API response missing created comment payload", 502, "UPSTREAM_ERROR");
    }
    return response.data;
  }

  async updateComment(params: {
    id: string;
    data: Record<string, unknown>;
  }): Promise<OutlineComment> {
    const response = await this.request<OutlineComment>("comments.update", stripUndefined(params));
    if (!response.data) {
      throw new OutlineApiError("Outline API response missing updated comment payload", 502, "UPSTREAM_ERROR");
    }
    return response.data;
  }

  async deleteComment(params: { id: string }): Promise<{ success: boolean; comment?: OutlineComment }> {
    const response = await this.request<OutlineComment>("comments.delete", stripUndefined(params));
    return {
      success: response.success === true || response.ok === true || typeof response.data !== "undefined",
      comment: response.data
    };
  }

  async exportCollection(params: {
    id: string;
    format?: "outline-markdown" | "json" | "html";
  }): Promise<FileOperation | null> {
    const response = await this.request<{ fileOperation?: FileOperation }>(
      "collections.export",
      stripUndefined(params)
    );
    return response.data?.fileOperation ?? null;
  }

  async exportAllCollections(params: {
    format?: "outline-markdown" | "json" | "html";
    includeAttachments?: boolean;
    includePrivate?: boolean;
  }): Promise<FileOperation | null> {
    const response = await this.request<{ fileOperation?: FileOperation }>(
      "collections.export_all",
      stripUndefined(params)
    );
    return response.data?.fileOperation ?? null;
  }

  async listFileOperations(params: {
    type: "import" | "export";
    limit?: number;
    offset?: number;
    sort?: string;
    direction?: SortDirection;
  }): Promise<FileOperationsListResponse> {
    const response = await this.request<FileOperationsListResponse["data"]>(
      "fileOperations.list",
      stripUndefined(params)
    );
    return {
      data: response.data ?? [],
      pagination: response.pagination,
      policies: response.policies
    };
  }

  async getFileOperation(params: { id: string }): Promise<FileOperation | null> {
    const response = await this.request<FileOperation>("fileOperations.info", stripUndefined(params));
    return response.data ?? null;
  }

  async getFileOperationRedirectUrl(params: { id: string }): Promise<{ url?: string; status: number }> {
    const response = await this.rawRequest("fileOperations.redirect", stripUndefined(params), {
      redirect: "manual"
    });

    const location = response.headers.get("location") ?? undefined;
    return {
      url: location,
      status: response.status
    };
  }

  async probeEndpoint(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<{ status: number | null }> {
    const url = `${this.baseUrl}/api/${endpoint}`;

    for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
      let response: Response;

      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.requestTimeoutMs)
        });
      } catch {
        if (attempt < this.retryCount) {
          await sleep(200 * (attempt + 1));
          continue;
        }
        return { status: null };
      }

      if (isRetryableStatus(response.status) && attempt < this.retryCount) {
        await sleep(200 * (attempt + 1));
        continue;
      }

      return { status: response.status };
    }

    return { status: null };
  }

  private async request<T>(endpoint: string, body: Record<string, unknown>): Promise<ApiEnvelope<T>> {
    const url = `${this.baseUrl}/api/${endpoint}`;

    for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
      let response: Response;

      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.requestTimeoutMs)
        });
      } catch (error) {
        if (attempt < this.retryCount) {
          await sleep(200 * (attempt + 1));
          continue;
        }
        throw new OutlineApiError(
          `Failed to call Outline API endpoint \"${endpoint}\": ${(error as Error).message}`,
          503,
          "UPSTREAM_ERROR"
        );
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        payload = undefined;
      }

      if (!response.ok) {
        if (isRetryableStatus(response.status) && attempt < this.retryCount) {
          await sleep(200 * (attempt + 1));
          continue;
        }

        const message =
          isRecord(payload) && typeof payload.error === "string"
            ? payload.error
            : `Outline API endpoint \"${endpoint}\" failed with status ${response.status}`;

        throw new OutlineApiError(
          message,
          response.status,
          response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR"
        );
      }

      if (!isRecord(payload)) {
        throw new OutlineApiError("Invalid JSON response from Outline API", 502, "UPSTREAM_ERROR");
      }

      const envelope = payload as ApiEnvelope<T>;
      if (typeof envelope.ok === "boolean" && !envelope.ok) {
        const status = typeof envelope.status === "number" ? envelope.status : response.status;

        if (isRetryableStatus(status) && attempt < this.retryCount) {
          await sleep(200 * (attempt + 1));
          continue;
        }

        throw new OutlineApiError(
          envelope.error ?? envelope.message ?? `Outline API endpoint \"${endpoint}\" returned ok=false`,
          status,
          status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR"
        );
      }

      return envelope;
    }

    throw new OutlineApiError("Unexpected retry flow termination", 500, "UPSTREAM_ERROR");
  }

  private async rawRequest(
    endpoint: string,
    body: Record<string, unknown>,
    init: {
      redirect?: RequestRedirect;
    } = {}
  ): Promise<Response> {
    const url = `${this.baseUrl}/api/${endpoint}`;

    for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
      let response: Response;

      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.requestTimeoutMs),
          redirect: init.redirect
        });
      } catch (error) {
        if (attempt < this.retryCount) {
          await sleep(200 * (attempt + 1));
          continue;
        }

        throw new OutlineApiError(
          `Failed to call Outline API endpoint \"${endpoint}\": ${(error as Error).message}`,
          503,
          "UPSTREAM_ERROR"
        );
      }

      if (!response.ok && isRetryableStatus(response.status) && attempt < this.retryCount) {
        await sleep(200 * (attempt + 1));
        continue;
      }

      if (response.status >= 400) {
        throw new OutlineApiError(
          `Outline API endpoint \"${endpoint}\" failed with status ${response.status}`,
          response.status,
          response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR"
        );
      }

      return response;
    }

    throw new OutlineApiError("Unexpected retry flow termination", 500, "UPSTREAM_ERROR");
  }
}
