<div align="center">

<img width="1280" height="240" alt="Image" src="https://github.com/user-attachments/assets/b7c53296-c7ee-4134-9492-53616f2ad59c" />

  <h1>Callsheet</h1>

  <p align="left">
    React Query gives you great building blocks but it's up to you to decide how operations should be organized.
    <br/>
    <strong> Callsheet provides one shared place for your operations, defaults, and related behaviors, built on the APIs you already use.</strong>
  </p>
<hr/>
</div>

## Docs

- [Docs](https://callsheet.nlewis.dev)
- [Quickstart](https://callsheet.nlewis.dev/getting-started/quickstart)
- [Using Callsheet with GraphQL](https://callsheet.nlewis.dev/getting-started/using-callsheet-with-graphql)
- [Manual Setup](https://callsheet.nlewis.dev/getting-started/manual-setup)
- [Generating Calls from ts-rest](https://callsheet.nlewis.dev/guides/ts-rest)

## Install

### With pnpm

```sh
pnpm add @callsheet/react-query @tanstack/react-query
```

### With npm

```sh
npm install @callsheet/react-query @tanstack/react-query
```

Callsheet builds from typed operations. It can also generate calls from your existing GraphQL and typed REST sources.

- Use `@callsheet/react-query` to define calls.
- Add `@callsheet/codegen` to auto-generate calls from [GraphQL Code Generator](https://github.com/dotansimha/graphql-code-generator) output.
- Add `@callsheet/ts-rest` for [ts-rest](https://github.com/ts-rest/ts-rest) support.

## Example

Callsheet is easiest to see in code. Here is the same workflow in React Query with and without Callsheet:

**Without Callsheet**:

```ts
export const filmKeys = {
  list: () => ['films', 'list'],
  detail: (id: string) => ['films', 'detail', id],
};

export const featuredFilmsOptions = queryOptions({
  queryKey: filmKeys.list(),
  queryFn: () => filmApi.featured(),
});

export const filmByIdOptions = (id: string) =>
  queryOptions({
    queryKey: filmKeys.detail(id),
    queryFn: () => filmApi.byId({ id }),
    staleTime: 30_000,
  });

export function useUpdateFilm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; title: string }) => filmApi.update(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: filmKeys.list() });
      queryClient.invalidateQueries({
        queryKey: filmKeys.detail(variables.id),
      });
    },
  });
}
```

**With Callsheet**:

`filmCalls.ts`

```ts
export const calls = defineCalls({
  films: {
    featured: query({
      family: ['films', 'list'],
    }),
    byId: query<{ id: string }>({
      family: ['films', 'detail'],
      staleTime: 30_000,
    }),
    update: mutation<{ id: string; title: string }>({
      invalidates: [
        ['films', 'list'],
        ['films', 'detail'],
      ],
    }),
  },
});
```

`FilmPage.tsx`

```ts
const featuredFilms = useQuery(queryOptions(calls.films.featured));

const film = useQuery(queryOptions(calls.films.byId, { input: { id } }));

const updateFilm = useMutation(calls.films.update);
```

Components still use normal React Query APIs, but they now build on a shared call definition with conventions organized in one place.

Callsheet works with any typed source: GraphQL documents, REST contracts, or calls you define by hand. The result is the same shared structure.

## Current Support

- React Query: [TanStack Query](https://github.com/TanStack/query)
- GraphQL generation: [GraphQL Code Generator](https://github.com/dotansimha/graphql-code-generator)
- Typed REST generation: [ts-rest](https://github.com/ts-rest/ts-rest)
- Manual integration for custom typed operations

## Roadmap

- Infinite query support for the React Query adapter
- Additional adapters, starting with `swr`, `urql`, and Apollo

See the full roadmap: [Roadmap](https://callsheet.nlewis.dev/project-status/roadmap)

## License

MIT
