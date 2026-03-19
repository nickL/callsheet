import type { TypedDocumentLike } from 'callsheet';

import { GeneratedFeaturedFilmsDocument } from './generated-documents';

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
