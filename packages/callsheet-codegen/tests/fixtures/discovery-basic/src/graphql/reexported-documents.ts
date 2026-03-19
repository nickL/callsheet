import type { TypedDocumentLike } from 'callsheet';

import {
  GeneratedFeaturedFilmsDocument,
  GeneratedRefreshFilmsDocument,
} from './generated-documents';

export interface ImportedFeaturedFilmsResult {
  films: readonly string[];
}

export interface ImportedRefreshFilmsResult {
  refreshed: boolean;
}

export const ImportedFeaturedFilmsDocument: TypedDocumentLike<
  ImportedFeaturedFilmsResult,
  void
> = GeneratedFeaturedFilmsDocument as unknown as TypedDocumentLike<
  ImportedFeaturedFilmsResult,
  void
>;

export const ImportedRefreshFilmsDocument: TypedDocumentLike<
  ImportedRefreshFilmsResult,
  void
> = GeneratedRefreshFilmsDocument as unknown as TypedDocumentLike<
  ImportedRefreshFilmsResult,
  void
>;
