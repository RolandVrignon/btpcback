import { OrganizationScope, Status, ProjectTag } from '@prisma/client';
import { Request } from 'express';

/**
 * Interfaces liées aux organisations
 */
export interface OrganizationEntity {
  id: string;
  name: string;
  scope: OrganizationScope;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces liées aux projets
 */
export interface ProjectEntity {
  id: string;
  name: string;
  salesforce_id?: string;
  ai_address?: string;
  status: Status;
  tags: ProjectTag[];
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces liées aux clés API
 */
export interface ApikeyEntity {
  id: string;
  key: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces liées aux documents
 */
export interface DocumentEntity {
  id: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces liées aux chunks
 */
export interface ChunkEntity {
  id: string;
  text: string;
  page?: number;
  documentId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaces liées aux embeddings
 */
export interface EmbeddingEntity {
  id: string;
  vector: number[];
  modelName: string;
  modelVersion: string;
  dimensions: number;
  chunkId: string;
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

export type FieldOrderObject = {
  __data: unknown;
  __fieldOrder: string[];
  __isArray: boolean;
};
