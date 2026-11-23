import { environment } from '@/shared/config/env';

export interface ResourceTreeNode {
  id: string;
  type: 'space' | 'folder' | 'page';
  title: string;
  spaceKey: string;
  parentId: string | null;
  children: ResourceTreeNode[];
}

export interface ResourcePage {
  id: string;
  title: string;
  spaceKey: string;
  parentId: string | null;
  body: string;
  version: number;
  lastModifiedBy: string;
  lastModifiedAt: string;
  url: string;
}

let treeCache: ResourceTreeNode[] | null = null;
let treePromise: Promise<ResourceTreeNode[]> | null = null;
const pageCache = new Map<string, ResourcePage>();
const pagePromises = new Map<string, Promise<ResourcePage>>();

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${environment.resourcesApiUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      message = payload.message || message;
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export const resourcesService = {
  getTree(spaceKey?: string, signal?: AbortSignal) {
    if (spaceKey) {
      const query = `?spaceKey=${encodeURIComponent(spaceKey)}`;
      return request<ResourceTreeNode[]>(`/atlassian/v2/folders${query}`, { signal });
    }
    if (treeCache) return Promise.resolve(treeCache);
    if (!treePromise) {
      treePromise = request<ResourceTreeNode[]>('/atlassian/v2/folders', { signal })
        .then(tree => {
          treeCache = tree;
          return tree;
        })
        .finally(() => {
          treePromise = null;
        });
    }
    return treePromise;
  },
  getPage(pageId: string, signal?: AbortSignal) {
    const cached = pageCache.get(pageId);
    if (cached) return Promise.resolve(cached);
    const pending = pagePromises.get(pageId);
    if (pending) return pending;
    const promise = request<ResourcePage>(`/atlassian/v2/pages/${encodeURIComponent(pageId)}`, { signal })
      .then(page => {
        pageCache.set(pageId, page);
        return page;
      })
      .finally(() => {
        pagePromises.delete(pageId);
      });
    pagePromises.set(pageId, promise);
    return promise;
  },
  clearTreeCache() {
    treeCache = null;
    treePromise = null;
  },
  clearPageCache(pageId?: string) {
    if (pageId) pageCache.delete(pageId);
    else pageCache.clear();
  },
  updatePage(pageId: string, title: string, body: string, parentId?: string, signal?: AbortSignal) {
    return request<ResourcePage>(`/atlassian/v2/pages/${encodeURIComponent(pageId)}`, {
      method: 'PUT',
      body: JSON.stringify({ title, body, ...(parentId ? { parentId } : {}) }),
      signal,
    });
  },
  createPage(title: string, spaceKey: string, parentId?: string, body = '<p><br /></p>') {
    return request<ResourcePage>('/atlassian/v2/pages', {
      method: 'POST',
      body: JSON.stringify({ title, spaceKey, parentId, body }),
    });
  },
  deletePage(pageId: string) {
    return request<{ success: boolean; message: string }>(`/atlassian/v2/pages/${encodeURIComponent(pageId)}`, {
      method: 'DELETE',
    });
  },
};

export function flattenResourcePages(nodes: ResourceTreeNode[]): ResourceTreeNode[] {
  const pages: ResourceTreeNode[] = [];
  const visit = (node: ResourceTreeNode) => {
    if (node.type === 'page') pages.push(node);
    node.children?.forEach(visit);
  };
  nodes.forEach(visit);
  return pages;
}
