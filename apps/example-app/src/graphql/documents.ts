import type { TypedDocumentLike } from 'callsheet';

export interface FeaturedFilmsResult {
  films: readonly string[];
}

export interface FilmByIdInput {
  id: string;
}

export interface FilmByIdResult {
  film: {
    id: string;
    title: string;
  };
}

export interface RefreshFilmsResult {
  refreshed: boolean;
}

export const FeaturedFilmsDocument: TypedDocumentLike<
  FeaturedFilmsResult,
  void
> = {
  definitions: [{ kind: 'OperationDefinition', operation: 'query' }],
};

export const FilmByIdDocument: TypedDocumentLike<
  FilmByIdResult,
  FilmByIdInput
> = {
  definitions: [{ kind: 'OperationDefinition', operation: 'query' }],
};

export const RefreshFilmsDocument: TypedDocumentLike<RefreshFilmsResult, void> =
  {
    definitions: [{ kind: 'OperationDefinition', operation: 'mutation' }],
  };
