The X-Framework is a set of tools that beautifully bridges the gap between your API Layer (GraphQL), your database (MongoDB), and your service layer. It is thought with fast-prototyping in mind but code scalability as well.

It has the following tools:

- Apollo Server Executors (CRUD Operations, Security Checks, Service Delegation)
- Apollo Server Scalars (Date, ObjectId)
- A defined way for standard CRUD interfaces
- Validator Transformers (Date, ObjectId, UniqueDatabaseField)

The family of X-Framework bundles is currently composed of:

- X-Generator which uses BlueLibs's Terminal Technology to develop applications fast.
- X-Password-Bundle which links Security, Mongo, Apollo to create a unified experience

## Install

```
npm i @bluelibs/x-bundle
```

```ts title="kernel.ts"
import { XBundle } from "@bluelibs/x-bundle";

const kernel = new Kernel({
  bundles: [
    new XBundle({
      // You should take these from environment, the reason we ask them is for easy routing
      // However, they are optional.

      // The URL of the application, your website (helpful for other bundles in the X-Framework ecosystem)
      appUrl: "http://localhost:3000",
      // The URL of the API endpoint
      rootUrl: "http://localhost:4000",
    }),
  ],
});
```

## Executors

Because our [resolvers can be chains of functions](https://www.bluelibs.com/docs/package-graphql#resolvers), we have created a set of them that allow us to easily operate within X-Framework and do things from fetching stuff from database to securing the request and even delegating to other services.

### Database

We use MongoDB Nova for fetching relational data. The Nova package has a way to transform a GraphQL request into a Nova request automatically fetching relations without any additional code:

```ts
import * as X from "@bluelibs/x-bundle";

export default {
  Query: {
    doSomething: [X.ToNova(CollectionClass)],
  },
};
```

If your query returns just one element, you can just use `X.ToNovaOne()` instead.

If you want to secure your Nova request to intersect based on some rules:

```ts
import { IAstToQueryOptions } from "@bluelibs/nova";

[
  X.ToNova(CollectionClass, async (_, args, ctx, info) => {
    // Should return IAstToQueryOptions
    return {
      intersect: {
        fieldName: 1,
        relation1: {
          relationField: 1,
        },
      },
      // Enforce other rules like:
      maxLimit: 100,
      maxDepth: 5,
      // Use MongoDB filters and options for first level
      filters: {},
      options: {},
    };
  }),
];
```

Another useful one is usually to find an element by \_id, this is why we have:

```ts
// Assuming you pass _id as argument to the query:
[
  X.ToNovaOne(CollectionClass, (_, args) => ({
    _id: args._id,
  })),
];
```

Read more on these nice options on [Nova Documentation](https://bluelibs.com/docs/package-nova)

Counting operations can be useful for paginated interfaces:

```ts
[
  X.ToCollectionCount(CollectionClass, (_, args) => ({
    // Here are filters returned, you can also read them from args if you prefer
    status: "approved",
  })),
];
```

If we want to ensure that a certain document exists before applying any change:

```ts
[
  // The second argument needs to return an _id
  // By default _id from args is taken like below
  X.CheckDocumentExists(CollectionClass, (_, args, ctx, info) => args._id),
];
```

Now let's work with some mutations:

```ts
`
type Query {
  insertSomething(post: PostNewInput): Post
  updateSomething(_id: ObjectId, dataSet: JSON): Post
  deleteSomething(_id: ObjectId): Boolean
}
`;

const insertSomething = [
  X.ToDocumentInsert(CollectionClass, "post"),
  // This one takes the returned _id from the above executor, and transforms it into a Nova query
  // So you can easily fetched the newly created document
  X.ToNovaByResultID(CollectionClass),
];

const updateSomething = [
  // Update accepts to arguments after collection: idResolver and mutationResolver which get `args` as their argument and return an _id and subsequently a "mutation" query
  // By default if you use the default one dataSet, it uses "$set" to update the provided data.
  X.ToDocumentUpdateByID(CollectionClass),
  X.ToNovaByResultID(CollectionClass),
];

const deleteSomething = [X.ToDocumentDeleteByID(CollectionClass, idResolver)];
```

### Logging

Whether you have mission critical queries/mutations in which you need logs for those actions or you simply want to debug the responses and requests much easier. You can use the following:

```ts
[
  // Requests should be added before your actual mutation
  X.LogRequest(),
  // Prints the arguments as JSON.stringified for full display
  X.LogRequestJSON(),

  // Logs the response and sends the result down the line
  X.LogResponse(),
  X.LogResponseJSON(),
  // You can put these logs at any stage in your pipeline
];
```

### Model & Validation

The arguments of GraphQL are objects, so it would be nice if we can easily transform them into models so we can "enhance" their functionality so-to-speak but more importantly to have them easily validatable. We will be using the [BlueLibs's validator package](https://bluelibs.com/docs/package-validator) We propose the following solution:

```ts
@Schema()
class User {
  @Is(a.string().required())
  firstName: string;
  @Is(a.string().required())
  lastName: string;
  get fullName() {
    return this.firstName + " " + this.lastName;
  }
}

[
  // The second argument refers to the argument's name that you want to transform
  // You should use simply "input" most of the times and these
  X.ToModel(User, "input"),
  X.Validate({ field: "input" })
  async (_, args, ctx) => {
    const user = args.input;
    // user instanceof User
    // user is validated, otherwies it would have thrown an exception
  }
];
```

### Security

We should be able to quickly check if a user is logged in or has certain permissions:

```ts
[
  // Check if the user is logged in, throws if not
  X.CheckLoggedIn(),
  X.CheckPermission("ADMIN"),
  // or multiple roles
  X.CheckPermission(["USER", "SUPER_USER"])
  // or custom so you can customise domain and others
  X.CheckPermission((_, args, ctx) => {
    // Returns a permission filter
    return {
      userId: ctx.userId,
      domain: "Projects",
    }
  })
]

// The permission search looks like this.
interface IPermissionSearchFilter {
    userId?: any | any[];
    permission?: string | string[];
    domain?: string | string[];
    domainIdentifier?: string | string[];
}
```

Security is not always simple and straight forward, but there are very common scenarios for securisation and we'll explore them below.

The logic of `X.Secure()` is simple:

- First we match the user to see what rules to apply
- We run the rules and if any throws an exception we stop executing the request
- If there's no match it throws
- Once the first match is found the others are ignored

#### Finding Data

- Check if the user has any specific roles
- Apply a set of filters to the requested data

```ts
[
  X.Secure([
    {
      // This states: if the user is ADMIN, don't have additional filtering or rules
      // Matches are resolver-like functions, you could implement your own.
      match: X.Secure.Match.Roles("ADMIN"),
    },
    {
      match: X.Secure.Match.Roles([
        "PROJECT_MANAGER",
        "PROJECT_DELIVERY_MANAGER",
      ]),
      run: [
        // You can intersect the GRAPHQL request. Optionally provide the type <User> for autocompletion.
        X.Secure.Intersect<User>({}),

        // Optionally apply certain filters when X.ToNova() is used below X.Secure()
        // The filters returned here also apply X.ToCollectionCount()
        X.Secure.ApplyNovaOptions({
          filters: {
            isApproved: true,
          },
        }),
        // Note: you can also use the filters as a resolver function if you want full customisation of filters based on userId or others
      ],
    },
  ]),
];
```

#### Mutating Data:

- Check if the user has any specific roles
- Check if the user is an owner to this document or has the propper roles

```ts
[
  X.Secure([
    {
      // This states: if the user is ADMIN, don't have additional filtering or rules
      match: X.Secure.Match.Roles("ADMIN"),
    },
    {
      match: X.Secure.Match.Roles([
        "PROJECT_MANAGER",
        "PROJECT_DELIVERY_MANAGER",
      ]),
      // Let's apply some rules when we're doing update or remove
      run: [
        // Checks if the current user owns the Post by equality matching ownerId
        // The _id represents the key of the _id extracted from arguments
        X.Secure.IsUser(PostsCollection, "ownerId", "_id"),
        // Note: this works when you also have ownersIds as the equality is done through $in via MongoDB
      ],
    },
  ]),
];
```

You can also have fallback rules that contain no `match`:

```ts
[
  X.Secure([
    {
      match,
      run: [],
    },
    {
      // An anonymous user for example
      run: [],
    },
  ]),
];
```

### Services

As we know, our logic should rely in the service layer instead of the resolvers, this is why we recommend for custom logic that cannot be satisfied through some useful executors, to delegate to your service

```ts
[
  X.ToService(ServiceClass, "method")
  // By default it transmits to "method" args.input and userId

  // However you can create your own mapper that returns an array of arguments
  // That will be applied properly
  X.ToService(ServiceClass, "extended", (_, args, ctx) => ([
    args, ctx
  ]))
]

class ServiceClass {
  async method(input, userId) {
    // Code goes here
  }

  async extended(allArguments, fullContext) {
    // Code goes here
  }
}
```

## Scalars

We provide the following scalars

### ObjectId

This will transform the ObjectId into a string and from a string to an ObjectId from bson, compatible with MongoDB.

### EJSON

We will use `EJSON` as a mechanism to allow rich data to be sent, including Dates, ObjectIds, RegEx and other fine ones.

What it does is pretty simple, it converts to ObjectId the strings it receives from GraphQL so it's easy for you to do searching and other cool stuff without worrying about it.

## Validators

### DateTransformer

If you plan on receiving the date in a string format such as "YYYY-MM-DD", then it would be helpful to have it ready as a Date when you want to use it:

```ts
class Post {
  // More about formats here: https://date-fns.org/v2.14.0/docs/format
  @Is(a.date().format("YYYY-MM-DD"))
  publishedAt: Date;
}
```

Now if you send it as a string, after it passes validation it will be a Date object.

### ObjectId

Your GraphQL scalar should take care of this already, but it's also good if we could re-use this logic in validation:

```ts
class Post {
  @Is(a.objectId())
  ownerId: any;
}
```

### Unique Database Field

If we want to easily prevent users from signing up with the same "phone number" let's say:

```ts
class User {
  @Is(
    a.string().required().uniqueField({
      collection: CollectionClass,
      field: "phoneNumber",
    })
  )
  phoneNumber: string;
  // Because we're in MongoDB's realm you can also use '.' for your fields for nested value
}
```

## Routers

The XBundle has two routers you can use, one is for the (ROOT) API endpoint the other is for your main application page:

```ts
import { APP_ROUTER, ROOT_ROUTER, Router } from "@bluelibs/x-bundle";

const appRouter = container.get<Router>(APP_ROUTER);
```

## CRUD Interfaces

If we want to go fast, we sometimes need to be "less specific" and go around some of GraphQL principles. Meaning that for filters we can work with a `JSON` and for `dataSet` on update

```graphql
input QueryInput {
  filters: JSON
  options: QueryOptionsInput
}

input QueryOptionsInput {
  sort: JSON
  limit: Int
  skip: Int
}

input DocumentUpdateInput {
  _id: ObjectId!
  dataSet: JSON!
}

input DocumentDeleteInput {
  _id: ObjectId!
}
```

This means that you can easily do a CRUD like:

```ts
export default /* GraphQL */ `
  type Query {
    adminPostsFindOne(query: QueryInput): Post
    adminPostsFind(query: QueryInput): [Post]!
    adminPostsCount(filters: JSON): Int!
  }

  type Mutation {
    adminPostsInsertOne(document: JSON!): Post
    adminPostsUpdateOne(_id: ObjectId!, dataSet: JSON!): Post!
    adminPostsDeleteOne(_id: ObjectId!): Boolean
  }
`;
```

Below you have a complete CRUD that later you can easily adapt to have type-safety at GraphQL level. This is very useful when you are generating lots of them.

```ts
import * as X from "@bluelibs/x-bundle";

export default {
  Query: [
    [],
    {
      adminPostsFindOne: [X.ToNovaOne(PostsCollection)],
      adminPostsFind: [X.ToNova(PostsCollection)],
      adminPostsCount: [X.ToCollectionCount(PostsCollection)],
    },
  ],
  Mutation: [
    [],
    {
      adminPostsInsertOne: [
        X.ToDocumentInsert(PostsCollection),
        X.ToNovaByID(PostsCollection),
      ],
      adminPostsUpdateOne: [
        X.CheckDocumentExists(PostsCollection),
        X.ToDocumentUpdateByID(PostsCollection),
        X.ToNovaByID(PostsCollection),
      ],
      adminPostsDeleteOne: [
        X.CheckDocumentExists(PostsCollection),
        X.ToDocumentDeleteByID(PostsCollection),
        X.ToNovaByID(PostsCollection),
      ],
    },
  ],
};
```

## Live Data

With LiveData you can subscribe and receive notifications when things change in the MongoDB database.

```ts title="kernel.ts"
new XBundle({
  live: {
    // This will log what changes are sent, received, and what gets updated
    debug: true,
  },
});
```

### Behaviors

Collections need to emit messages when a mutation (insert/update/remove) happens in the system. We do this by attaching a behavior to it.

```ts
import { Behaviors } from "@bluelibs/x-bundle";

class PostsCollection extends Collection {
  behaviors: [
    Behaviors.Live()
  ]
}
```

### Disable

If you have large updates that don't require reactivity, disable it to save performance.

```ts
const postsCollection = container.get(PostsCollection);

postsCollection.updateOne(_id, modifier, {
  live: {
    disable: true,
  },
});
```

### Create a subscription

Creating a subscription is like doing a Nova query. Keep in mind that reactivity is only triggered at the level of the collection.

```ts
const postsCollection = container.get(PostsCollection);
const handle = SubscriptionStore.createSubscription(
  postsCollection,
  {
    // BlueLibs NOVA Query
    $: {
      filters: {},
      options: {},
    }
    // Specify the fields needed
    title: 1,
  },
  {
    async onAdded(document) {
      // Do something
    },
    async onChanged(documentId, updateSet, oldDocument) {
      // Do something else
    },
    async onRemoved(documentId) {
      // Do something else
    },
  }
);

handle.onStop(() => {});
handle.stop();
```

```info
So if you use links, and data from those links change, you will not see any changes.
```

### GraphQL

A sample implementation in GraphQL.

```graphql
type Subscription {
  users(body: EJSON): SubscriptionEvent
}
```

```ts
// Resolver
const resolvers = {
  Subscription: {
    users: {
      resolve: (payload) => payload,
      subscribe(_, args, { container }, ast) {
        const collection = container.get(collectionClass);
        const subscriptionStore = container.get(SubscriptionStore);

        subscriptionStore.createAsyncIterator(collection, args.body);
      },
    },
  },
};
```

You can additionally hook into the resolve() function and apply additional changes or data clearences before it sends the data to the client.

```ts
import { GraphQLSubscriptionEvent } from "@bluelibs/x-bundle";

const subscription = {
  async resolve({ event, document }, args, { container }) {
    if (event === GraphQLSubscriptionEvent.ADDED) {
      // Attach information to document
      Object.assign(document, {
        // ...
      });
    }
    // You can also apply the same concepts for example when a certain relation is changing.

    return { event, document };
  },
  subscribe() {},
};
```

An example of how can we notify a client that something new was added to a certain view:

```ts
import { Event } from "@bluelibs/x-bundle";

const subscription = {
  resolve: (payload) => ({ event: payload.event }),
  subscribe(_, args, { db }) {
    const collection = container.get(collectionClass);
    const subscriptionStore = container.get(SubscriptionStore);

    return subscriptionStore.createAsyncIterator(collection, {
      filters: args.filters,
      options: {
        // Note that we only subscribe by _id we only care about new things that are added
        fields: { _id: 1 },
      },
    });
  },
};
```

You also have the ability to have a counter subscription:

```graphql
type Subscription {
  usersCount(body: EJSON): SubscriptionCountEvent
}
```

```ts
function subscribe(_, args, { db }) {
  const collection = container.get(collectionClass);
  const subscriptionStore = container.get(SubscriptionStore);

  return subscriptionStore.createAsyncIteratorForCount(collection, filters);
}
```

### Executors

To allow you to write less code, you can use the built-in executors:

```ts
import * as X from "@bluelibs/x-bundle";

export default {
  Subscription: {
    // Default resolver works for argument signature: { body: EJSON }
    usersSubscription: {
      resolve: (payload) => payload,
      subscribe: [X.ToSubscription(collectionClass)],
    },
    // Default resolver works for argument signature: { body: EJSON }
    usersSubscription: {
      resolve: (payload) => payload,
      subscribe: [
        X.ToSubscription(collectionClass, (_, args) => {
          // Here you can use intersectBody from @bluelibs/nova to perform smart operations
          // return intersectBody(args.body, allowedBody)
          return args.body;
        }),
      ],
    },
    // Default resolver works for argument signature: { filters: EJSON }
    usersSubscriptionsCount: {
      resolve: (payload) => payload,
      subscribe: [X.ToSubscriptionCount(collectionClass)],
    },
  },
};
```

### Deployment & Customisation

When you deploy on more than one server, you need a way to communicate for live data. You have the built-in redis tool:

```ts
new XBundle({
  live: {
    // Keep redis in your network's infrastructure for fast speeds
    // More about options here: https://github.com/NodeRedis/node-redis#rediscreateclient
    redis: {
      host: "127.0.0.1",
      port: 6379,
    },
  },
});
```

If redis connection dies, once it gets reconnected all the "live queries" will be requeried from the database automatically.

While Redis is nice, we also allow you to use your own custom messenger, which implements the exported interface `IMessenger`.

```ts
import { Service } from "@bluelibs/core";
import { IMessenger, XBundle, MessageHandleType } from "@bluelibs/x-bundle";

@Service()
class AppMessenger implements IMessenger {
  // To implement the methods below.
  subscribe(channel: string, handler: MessageHandleType);
  unsubscribe(channel: string, handler: MessageHandleType);
  // Keep in mind data can be anything, you need to ensure serialisation/deserialisation yourself.
  publish(channels: string[], data);
}

new XBundle({
  live: {
    messengerClass: AppMessenger,
  },
});
```

### Scaling

When you subscribe for elements by `_id` or a list of ids. It's incredibly scalable because you listen to events on their dedicated channel, example: `posts:{postId}`, so you don't have to worry at all about that. Redis server scales and it can handle 300,000 messages/second.

The scaling problem happens on lists, for example, you want to listen to a list of messages in a certain thread. When we are subscribing to lists (aka live collection views), we are listening to events on the collection channel, example: `posts`. All updates, inserts, removes which happen in `posts`, will reach all servers.

While this can work for a while, it breaks when you have chatty collections when a lot of mutations happen on it.

To do so, we need to add focus to the live data by using custom channels.

Let's take the example of comments on a post:

```ts
const postCommentsCollection = container.get(PostCommentsCollection);

postCommentsCollection.insertOne(comment, {
  context: {
    live: {
      // Note: this will also push to `comments` and `comments::${commentId}`
      channels: [`posts::${postId}::comments`],
    },
  },
});

// And for your GQL resolver, or whatever, pass the next argument the options:
const resolvers = {
  postCommentsSubscription: {
    subscribe: X.ToSubscription(
      CommentsCollection,
      // Resolve body
      null,
      (_, args) => {
        return {
          channels: [`posts::${args.postId}::comments`]
        }
      }
    );
  },
};
```

Be careful with live-data, use it sparingly and only when you need it, this will ensure that your app is scalable for a long time. Keep in mind that the most dangerous subscriptions are the ones that listen to the main collection channels. You shouldn't be worried if you have 10 mutations per second, which happens only after a certain scale either way.
