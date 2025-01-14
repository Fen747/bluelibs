ApolloBundle quickly bootstraps an Apollo Server within BlueLibs's framework. It injects the `container` inside the context and allows you to easily create server-side routes.

## Usage

```typescript
import { ApolloBundle } from "@bluelibs/apollo-bundle";

kernel.addBundle(
  new ApolloBundle({
    // (optional) Apollo additional configuration
    apollo: ApolloServerExpressConfig,

    // (optional) Whether to install websocket handlers
    enableSubscriptions: false,

    // (optional) Express middlewares:
    middlewares: [],

    // (optional) Server Side Routes
    // You can also add them from your bundle via `.addRoute()`
    routes: [
      {
        type: "post", // "get", "put", "all"
        path: "/api/payment-handler/:orderId",
        handler: async (container, req, res) => {},
        // These are optional and used for body-parsing
        json: true,
        urlencoded: true,
      },
    ],

    // Use uploads: false if you want to disable support for file uploading via graphql-upload
    uploads: {
      maxFileSize: 1024 * 1024 * 1000, // 1000 mega bytes, default is 10e9
      maxFiles: 10, // how many files can a user upload at once?
    },
  })
);
```

## Loading API Definitions

```typescript
import { Bundle } from "@bluelibs/core";
import { Loader } from "@bluelibs/graphql-bundle";

class CoreBundle extends Bundle {
  prepare() {
    const loader = this.get<Loader>(Loader);

    loader.load({
      typeDefs: `
        type Query {
          sayHello: String
        }
      `,
      resolvers: {
        Query: {
          sayHello: (_, args, ctx) => {
            // You have access to the kernel container via: ctx.container
            return "Hello world!";
          },
        },
      },
      contextReducers: async function storeUser(ctx) {
        // Note that if you have subscriptions enabled
        // You'll have to read from connectionParams rather than req.
        return {
          ...ctx,
          userId: "XXX",
        };
      },
    });
  }
}
```
