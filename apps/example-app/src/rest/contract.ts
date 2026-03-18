import { initContract } from '@ts-rest/core';

import type { ClientInferRequest } from '@ts-rest/core';

export interface UserByIdResult {
  user: {
    id: string;
    name: string;
  };
}

const c = initContract();

export const contract = c.router({
  users: {
    byId: c.query({
      method: 'GET',
      path: '/users/:id',
      pathParams: c.type<{ id: string }>(),
      responses: {
        200: c.type<UserByIdResult>(),
      },
    }),
  },
});

export type UserByIdInput = ClientInferRequest<typeof contract.users.byId>;
