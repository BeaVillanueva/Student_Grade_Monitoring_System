# SGMS backend

NestJS and TypeScript backend for the ITEC 116 Student Grade Monitoring System.
See the [root README](../README.md) for setup and initialization scope.

Run commands from this directory:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd test -- --runInBand
npm.cmd run start:dev
```

The initial application contains only the generated sample controller and service.
Database connections, six entities, explicit migrations, and a fictional demo seed
are implemented. See [database documentation](../docs/database-design.md).
Authentication and functional REST API modules remain deferred.
