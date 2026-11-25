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
Database connections, entities, authentication, and functional modules are deferred.
Installing dependencies does not activate those features.
