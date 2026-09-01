const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface RequesterUser {
  id: number;
  fullName: string;
  email: string;
  department: string;
  isActive: boolean;
}

export interface Category {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface RelatedSystem {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error(`Health check failed with status ${healthRes.status}`);
  }
  const healthData = await healthRes.json();
  if (healthData.status !== "ok") {
    throw new Error("Backend health status is not ok");
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error(`Categories fetch failed with status ${categoriesRes.status}`);
  }
  const categories: Category[] = await categoriesRes.json();

  return {
    online: true,
    categories,
  };
}

export async function fetchRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error(`Failed to fetch requesters: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error(`Failed to fetch related systems: HTTP ${res.status}`);
  }
  return res.json();
}