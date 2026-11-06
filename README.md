# OrderMate app frontend

Fresh React + Vite project with JavaScript, hot module replacement and Oxlint.

## Development

Use Node.js 22.12+ or 24+ and npm.

```sh
npm install
npm start
```

The development server runs at http://localhost:6600 and listens on all network
interfaces. `npm run dev` also starts Vite in development mode. If port 6600 is
already in use, startup fails instead of switching to another port.

## Checks and build

```sh
npm run lint
npm run build
```

`npm run build` creates the new build in `../production_new/`, while the current
`../production/` remains available. Once the build and URL replacement succeed,
the current directory is renamed to `../production_old/`, and the new directory
is renamed to `../production/`. Only then is `../production_old/` deleted.

A failed build leaves the current production build untouched. If the directory
swap fails, the previous build is restored. Concurrent builds are blocked by
`../production.build-lock/`; an interrupted build may leave that lock behind,
which can be removed once no build is running.

During the build, `https://dev.ordermate.com` is replaced with
`https://ordermate.com` in generated text files and copied public text files.
Development source files and binary assets are preserved.

Use `npm run preview` to preview the production build.
