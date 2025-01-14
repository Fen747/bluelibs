This is a bundle that integrates nicely with [express](http://expressjs.com/en/api.html#express) within the framework.

## Install

```ts
import { Kernel } from "@bluelibs/core";
import { HTTPBundle } from "@bluelibs/http-bundle";

const kernel = new Kernel({
  bundles: [
    // ... the rest
    new HTTPBundle({
      port: 5000,
    }),
  ],
});
```

HTTPBundle starts the `listen()` in the `KernelAfterInit` hook. So the application starts listening before `kernel.init()` promise resolves. If there's an error with starting the server like the port is already in use, the `kernel.init()` will fail.

## Usage

The most typical thing you would do is add middlewares and routes. You have access to the `express.Application` directly from the bundle, and an easy way to just add routes:

```ts
class AppBundle extends Bundle {
  async init() {
    const httpBundle = this.container.get(HTTPBundle);

    // You have access to, if you want to perform other configurations to it
    httpBundle.app;
    httpBundle.router;

    // You can add routes in prepare() phase too
    httpBundle.addRoute({
      type: "get",
      path: "/users/:userId",
      async handler(container, req, res, next) {
        // Query the users from the database service you get via container
        res.json({
          user: {},
        });
      },
    });
  }
}
```

A good idea is to separate your routes:

```ts title="routes.ts"
import { RouteType } from "@bluelibs/http-bundle";

export const routes: RouteType[] = [
  {
    type: "get",
    path: "/users",
    async handler(container, req, res, next) {
      // do your thing
    },
  },
];
```

Handlers can be chainable:

```ts
async function CheckLoggedIn(container, req, res, next) {
  // throw exception if not ok
}

export const routes: RouteType[] = [
  {
    type: "get",
    path: "/users",
    handler: [
      CheckLoggedIn(),
      (container, req, res, next) => {
        // something else
      },
    ],
  },
];
```

Now you can better add them without poluting bundle code:

```ts
httpBundle.addRoutes(routes);
```

## Events

You have two specialized events at your disposal:

```ts
import {
  HTTPServerBeforeInitialisationEvent,
  HTTPServerInitialisedEvent,
} from "@bluelibs/http-bundle";

// HTTPServerBeforeInitialisationEvent : before starting to listen()
// HTTPServerInitialisedEvent : after listen() has started successfully
```

## Express Access

After `HTTPBundle` finishes preparation you already have an `app` property which the express instance:

```tsx
// Do custom things with express
const app = container.get(HTTPBundle).app;

// Routes are added on the default router, which you can change
const router = container.get(HTTPBundle).router;
```
