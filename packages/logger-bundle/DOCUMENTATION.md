This bundle allows you to log information that happens in your sistem. The logger can optionally output to `console.log` but later on, as your system grows, all of your instances should output to a centralised log management place. This is why we strongly recommend, as you're building your app, to use `LoggerService` instead of `console.log`

```typescript
new LoggerBundle({
  // This will just print the log to console as well
  console: true,
});
```

If you want to use it:

```typescript
const logger = container.get(LoggerService);
logger.info("User access forbidden");

// Add more context to your log
logger.info("User access forbidden", { route: "/123" }); // You can do anything you like to your context

// Some other type of logs
logger.warning("User access forbidden");
logger.error("User access forbidden");
logger.critical("User access forbidden");
```

The log object created looks like this:

```typescript
export interface ILog {
  message: string;
  level: LogLevel; // INFO, ERROR, WARNING, CRITICAL
  context: any;
}
```

If you want to listen to event and email all the critical ones:

```typescript
import { Listener, On } from "@bluelibs/core";
import { LogEvent, LogLevel } from "@bluelibs/logger-bundle";

export class EmailCriticalLogs extends Listener {
  constructor(protected readonly emailService: EmailService) {}

  @On(LogEvent)
  onLog(e: LogEvent) {
    const log = e.data.log;

    if (log.level === LogLevel.CRITICAL) {
      // this.emailService.send()
    }
  }
}
```

And ofcourse don't forget to register you listener:

```typescript
class AppBundle extends Bundle {
  async prepare() {
    // Warming up simply means instantiating and running init so it attaches events
    this.warmup([EmailCriticalLogs]);
  }
}
```

## Custom Log Object

You can customise your `Log` model if you want for example specific contexts or other stuff:

```ts
import { LoggerService, Log, LogLevel } from "@bluelibs/logger-bundle";

class UserLog extends Log<{ userId: string }> {}

const logger = container.get(LoggerService);

// This will get dispatched, and next you can do custom compute for your log by checking instance of
logger.send(new UserLog("message", LogLevel.INFO, { userId: "XXX" }));
```
