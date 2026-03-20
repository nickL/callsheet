<h1 align="center">Callsheet</h1>

<p align="center">
  Standardize typed operations in React Query.
</p>

Callsheet helps React Query apps move from scattered request patterns to a shared, type-safe call catalog. It helps you establish conventions for consistent naming, shared defaults, and cache behaviors.

```sh
pnpm add @callsheet/react-query @tanstack/react-query
pnpm add -D @callsheet/codegen
```

Callsheet builds from typed operations. It can also generate calls from your existing GraphQL and typed REST sources.

- Use `@callsheet/react-query` to author calls.
- Add `@callsheet/codegen` to auto-generate calls from [GraphQL Code Generator](https://github.com/dotansimha/graphql-code-generator) output.
- Add `@callsheet/ts-rest` when auto-generating calls from [ts-rest](https://github.com/ts-rest/ts-rest) contracts.

## Docs

- [Docs](https://callsheet.nlewis.dev)
- [Quickstart](https://callsheet.nlewis.dev/getting-started/quickstart)
- [Generated Calls with GraphQL Code Generator](https://callsheet.nlewis.dev/getting-started/generated-calls-with-graphql-codegen)
- [Manual adoption](https://callsheet.nlewis.dev/getting-started/manual-adoption)

## But, why do I need this?

React Query already gives you good primitives like `queryOptions(...)`, custom hooks, and key factories. But it gets tricky later, as your application grows, and reads, writes, cache identity, and invalidation end up split across several places.

Callsheet gives your operations one typed place to live, and makes it easier to organize shared behaviors around related requests. It helps you one consistent workflow to:

- Discover and manage operations through one shared call surface instead of scattered local definitions.
- Share policy and defaults without giving up local control in components.
- Standardize cache behaviors across all your typed calls.

### Here's a working example:

Before:

```ts
export const filmKeys = {
  list: () => ['films', 'list'] as const,
  detail: (id: string) => ['films', 'detail', id] as const,
};

export const featuredFilmsOptions = queryOptions({
  queryKey: filmKeys.list(),
  queryFn: () => graphqlClient.request(FeaturedFilmsDocument),
});

export const filmByIdOptions = (id: string) =>
  queryOptions({
    queryKey: filmKeys.detail(id),
    queryFn: () => graphqlClient.request(FilmByIdDocument, { id }),
    staleTime: 30_000,
  });

export function useUpdateFilm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateFilmMutationVariables) =>
      graphqlClient.request(UpdateFilmDocument, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: filmKeys.list() });
      queryClient.invalidateQueries({
        queryKey: filmKeys.detail(variables.id),
      });
    },
  });
}
```

After:

`calls.ts`

```ts
export const calls = defineCalls({
  films: {
    featured: query(FeaturedFilmsDocument, {
      scope: ['films', 'list'] as const,
    }),
    byId: query(FilmByIdDocument, {
      scope: ['films', 'detail'] as const,
      staleTime: 30_000,
    }),
    update: mutation(UpdateFilmDocument, {
      invalidates: [
        ['films', 'list'],
        ['films', 'detail'],
      ] as const,
    }),
  },
} as const);
```

`FilmPage.tsx`

```ts
const featuredFilms = useQuery(queryOptions(calls.films.featured));

const film = useQuery(
  queryOptions(calls.films.byId, {
    input: { id },
    select: (data) => data.film,
  }),
);

const updateFilm = useMutation(calls.films.update);
```

## Current Support

- React Query runtime support via [TanStack Query](https://github.com/TanStack/query)
- GraphQL generation via [GraphQL Code Generator](https://github.com/dotansimha/graphql-code-generator)
- Typed REST generation via [ts-rest](https://github.com/ts-rest/ts-rest)
- Manual integration for custom typed operations

## Roadmap

- Additional adapters, including `urql`
- Additional frameworks, including Svelte, Vue, Angular, and Preact
- Broader typed REST discovery beyond `ts-rest`

## License

MIT
