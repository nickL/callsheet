import { initContract } from '@ts-rest/core';

const c = initContract();

export const contract = c.router({
  users: {
    byId: c.query({
      method: 'GET',
      path: '/users/:id',
      pathParams: c.type<{ id: string }>(),
      responses: {
        200: c.type<{ user: { id: string; name: string } }>(),
      },
    }),
    update: c.mutation({
      body: c.type<{ name: string }>(),
      method: 'PATCH',
      path: '/users/:id',
      pathParams: c.type<{ id: string }>(),
      responses: {
        200: c.type<{ updated: true }>(),
      },
    }),
  },
});
