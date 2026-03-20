import { GeneratedFeaturedFilmsDocument } from './generated-documents';

interface TypedDocumentLike<TResult, TVariables> {
  readonly __resultType?: TResult;
  readonly __variablesType?: TVariables;
  readonly definitions: readonly unknown[];
  readonly kind: 'Document';
}

export interface DuplicateFeaturedFilmsResult {
  films: readonly string[];
}

export const DuplicateFeaturedFilmsDocument: TypedDocumentLike<
  DuplicateFeaturedFilmsResult,
  void
> = GeneratedFeaturedFilmsDocument as unknown as TypedDocumentLike<
  DuplicateFeaturedFilmsResult,
  void
>;
