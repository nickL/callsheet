import {
  GeneratedFeaturedFilmsDocument,
  GeneratedRefreshFilmsDocument,
} from './generated-documents';

interface TypedDocumentLike<TResult, TVariables> {
  readonly __resultType?: TResult;
  readonly __variablesType?: TVariables;
  readonly definitions: readonly unknown[];
  readonly kind: 'Document';
}

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
