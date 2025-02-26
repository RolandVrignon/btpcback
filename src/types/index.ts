import { OrganizationScope, ProjectStatus, ProjectTag } from '@prisma/client';
import { Request } from 'express';

/**
 * Interfaces liées aux organisations
 */
export interface OrganizationEntity {
  id: number;
  name: string;
  scope: OrganizationScope;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces liées aux projets
 */
export interface ProjectEntity {
  id: number;
  name: string;
  salesforce_id?: string;
  ai_address?: string;
  status: ProjectStatus;
  tags: ProjectTag[];
  organizationId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces liées aux clés API
 */
export interface ApikeyEntity {
  id: number;
  key: string;
  organizationId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces liées aux documents
 */
export interface DocumentEntity {
  id: number;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  projectId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces liées aux chunks
 */
export interface ChunkEntity {
  id: number;
  text: string;
  page?: number;
  documentId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces liées aux embeddings
 */
export interface EmbeddingEntity {
  id: number;
  vector: number[];
  modelName: string;
  modelVersion: string;
  dimensions: number;
  chunkId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces pour les requêtes Express étendues
 */
export interface RequestWithOrganization extends Request {
  organization: OrganizationEntity;
}

/**
 * Types pour les réponses d'API
 */
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

/**
 * Types pour la pagination
 */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Types pour les options de recherche
 */
export type SearchOptions = {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};
