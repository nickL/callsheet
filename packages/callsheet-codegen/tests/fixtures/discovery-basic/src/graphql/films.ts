import { SharedFilmByIdDocument } from '@/graphql/shared';

export {
  BuildDocument,
  DraftDocument,
  FilmStatusDocument,
  LoadDocument,
  PendingDocument,
  PlainObjectDocument,
} from './non-document-exports';
export { FeaturedFilmsDocument, HiddenDocument } from './film-document-exports';
export { SharedFilmByIdDocument };

export interface IgnoredDocument {
  id: string;
}

interface TypeOnlyDocument {
  id: string;
}
export type { TypeOnlyDocument as TypeOnlyDocumentDocument };

export const helper = {} as const;
