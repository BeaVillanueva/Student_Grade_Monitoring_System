# SGMS backend

NestJS and TypeScript backend for the ITEC 116 Student Grade Monitoring System.
See the [root README](../README.md) for setup and initialization scope.

Run commands from this directory:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run test:e2e -- --runInBand
npm.cmd run start:dev
```

Database connections, six entities, explicit migrations, and a fictional demo seed
are implemented. See [database documentation](../docs/database-design.md).
JWT login, protected profile retrieval, reusable guards, validation, and rate limiting
are implemented. See [authentication documentation](../docs/authentication-security.md).
Academic CRUD API modules remain deferred.
