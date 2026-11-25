import { RequestMethod } from '@nestjs/common';
import {
  MODULE_METADATA,
  PATH_METADATA,
  METHOD_METADATA,
} from '@nestjs/common/constants';
import { AppModule } from '../src/app.module';
import { PUBLIC_ROUTE } from '../src/auth/decorators/public.decorator';

const expected = [
  'POST /api/v1/auth/login',
  'GET /api/v1/auth/me',
  'POST /api/v1/subjects',
  'GET /api/v1/subjects',
  'GET /api/v1/subjects/:id',
  'PUT /api/v1/subjects/:id',
  'DELETE /api/v1/subjects/:id',
  'POST /api/v1/enrollments',
  'GET /api/v1/enrollments',
  'GET /api/v1/enrollments/:id',
  'PUT /api/v1/enrollments/:id',
  'DELETE /api/v1/enrollments/:id',
  'GET /api/v1/grades',
  'POST /api/v1/grades',
  'PATCH /api/v1/grades/:id',
  'GET /api/v1/grade-inquiries',
  'POST /api/v1/grade-inquiries',
  'PATCH /api/v1/grade-inquiries/:id',
  'GET /api/v1/users',
  'GET /api/v1/users/:id',
  'POST /api/v1/users',
  'PATCH /api/v1/users/:id',
];
function inventory() {
  const visited = new Set<unknown>();
  const routes: { route: string; public: boolean }[] = [];
  function visit(input: any) {
    const module = input?.module ?? input;
    if (!module || visited.has(module)) return;
    visited.add(module);
    for (const child of [
      ...(Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) ?? []),
      ...(input.imports ?? []),
    ])
      visit(child);
    for (const controller of [
      ...(Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, module) ?? []),
      ...(input.controllers ?? []),
    ]) {
      const base = Reflect.getMetadata(PATH_METADATA, controller);
      for (const name of Object.getOwnPropertyNames(controller.prototype)) {
        const handler = controller.prototype[name];
        const method = Reflect.getMetadata(METHOD_METADATA, handler);
        if (method === undefined) continue;
        const path = [base, Reflect.getMetadata(PATH_METADATA, handler)]
          .filter((value) => value && value !== '/')
          .join('/');
        routes.push({
          route: `${RequestMethod[method]} /api/v1/${path}`,
          public: Reflect.getMetadata(PUBLIC_ROUTE, handler) === true,
        });
      }
    }
  }
  visit(AppModule);
  return routes;
}
describe('Complete production REST contract', () => {
  it('contains exactly the 22 approved method/path pairs with no test routes', () => {
    expect(
      inventory()
        .map((row) => row.route)
        .sort(),
    ).toEqual([...expected].sort());
  });
  it('retains every original Lab 05 endpoint', () => {
    const actual = inventory().map((row) => row.route);
    for (const route of [
      'GET /api/v1/users/:id',
      'GET /api/v1/subjects',
      'PUT /api/v1/subjects/:id',
      'POST /api/v1/enrollments',
      'GET /api/v1/enrollments',
      'DELETE /api/v1/enrollments/:id',
      'GET /api/v1/grades',
      'PATCH /api/v1/grades/:id',
      'POST /api/v1/grade-inquiries',
      'PATCH /api/v1/grade-inquiries/:id',
    ])
      expect(actual).toContain(route);
  });
  it('has login as the only public production endpoint', () => {
    expect(
      inventory()
        .filter((row) => row.public)
        .map((row) => row.route),
    ).toEqual(['POST /api/v1/auth/login']);
  });
});
