import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export type Film = {
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
};

export type Mutation = {
  refreshFilms: Scalars['Boolean']['output'];
};

export type Query = {
  featuredFilms: Array<Scalars['String']['output']>;
  filmById: Film;
};

export type QueryFilmByIdArgs = {
  id: Scalars['ID']['input'];
};

export type FeaturedFilmsQueryVariables = Exact<{ [key: string]: never }>;

export type FeaturedFilmsQuery = { films: Array<string> };

export type FilmByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type FilmByIdQuery = { film: { id: string; title: string } };

export type RefreshFilmsMutationVariables = Exact<{ [key: string]: never }>;

export type RefreshFilmsMutation = { refreshed: boolean };

export const FeaturedFilmsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'FeaturedFilms' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            alias: { kind: 'Name', value: 'films' },
            name: { kind: 'Name', value: 'featuredFilms' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<FeaturedFilmsQuery, FeaturedFilmsQueryVariables>;
export const FilmByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'FilmById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            alias: { kind: 'Name', value: 'film' },
            name: { kind: 'Name', value: 'filmById' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<FilmByIdQuery, FilmByIdQueryVariables>;
export const RefreshFilmsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RefreshFilms' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            alias: { kind: 'Name', value: 'refreshed' },
            name: { kind: 'Name', value: 'refreshFilms' },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  RefreshFilmsMutation,
  RefreshFilmsMutationVariables
>;
