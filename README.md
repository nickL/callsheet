<div align="center">

<img width="1280" height="240" alt="Image" src="https://github.com/user-attachments/assets/b7c53296-c7ee-4134-9492-53616f2ad59c" />

  <h1>Callsheet</h1>

  <p align="center">
    Data-fetching libraries give you great building blocks but it's up to you to decide how operations should be organized.<br/>
    <strong>Callsheet provides one shared place for your operations, defaults, and related behaviors, built on the APIs you already use.</strong>
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

### React Query

```sh
npm install @callsheet/react-query @tanstack/react-query
```

### SWR

```sh
npm install @callsheet/swr swr
```

Callsheet builds from typed operations. It can also generate calls from your existing GraphQL and typed REST sources.

- Add `@callsheet/codegen` to auto-generate calls from [GraphQL Code Generator](https://github.com/dotansimha/graphql-code-generator) output or [ts-rest](https://github.com/ts-rest/ts-rest) contracts.
- Add `@callsheet/ts-rest` for manual [ts-rest](https://github.com/ts-rest/ts-rest) wrappers.

## Example

Define your calls once with shared identity and invalidation rules:

```ts title="src/calls.ts"
export const calls = defineCalls({
  films: {
    featured: query({
      family: ['films', 'list'],
    }),
    byId: query<{ id: string }>({
      family: ['films', 'detail'],
      key: ({ input }) => [input.id],
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

Then use them through your adapter:

**React Query**

```ts
const film = useQuery(queryOptions(calls.films.byId, { input: { id } }));
const updateFilm = useMutation(calls.films.update);
```

**SWR**

```ts
const { data: film } = useQuery(calls.films.byId, { input: { id } });
const { trigger: updateFilm } = useMutation(calls.films.update);
```

Components still use normal React Query or SWR APIs, but they build on a shared call definition with conventions organized in one place.

Callsheet works with any typed source: GraphQL documents, REST contracts, or calls you define by hand. The result is the same shared structure.

## Current Support

- Adapters: [React Query](https://github.com/TanStack/query), [SWR](https://github.com/vercel/swr)
- GraphQL generation: [GraphQL Code Generator](https://github.com/dotansimha/graphql-code-generator)
- Typed REST generation: [ts-rest](https://github.com/ts-rest/ts-rest)
- Manual integration for custom typed operations

## Roadmap

- Infinite query support
- Additional framework and adapter support

See the full roadmap: [Roadmap](https://callsheet.nlewis.dev/project-status/roadmap)

## License

MIT
