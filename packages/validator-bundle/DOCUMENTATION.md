This package contains a neat, TypeScript-oriented solution to validating models, creating custom validation constraints that are container-aware. It leverages the awesome [yup validation package](https://github.com/jquense/yup).

```bash
npm i -S yup @bluelibs/validator-bundle
```

```typescript
import { a, an, Is, Schema } from "@bluelibs/validator-bundle";

// a, an === yup basically
@Schema()
class UserRegistrationInput {
  @Is(a.string().email())
  email: string;

  @Is(a.number().lessThan(150).moreThan(18))
  age: number;

  // Basically when you're dealing with external classes use a function and use Schema.from(class)
  @Is(() => Schema.from(ProfileRegistrationInput))
  profile: ProfileRegistrationInput;
}

@Schema()
export class ProfileRegistrationInput {
  @Is(a.string())
  firstName: string;

  @Is(a.string())
  lastName: string;
}
```

```typescript
const validatorService = container.get(ValidatorService);

validatorService.validate(dataSet, {
  model: UserRegistrationInput,
  ...otherOptionsFromYup, // found in it's official documentation
});
```

Or simply validate the instance by using the `class-transformer` npm package:

```typescript
const instance = plainToClass(UserRegistrationInput, dataSet);

// If you use the instance, it'll know the constructor and you will not have to provide the schema model
await validatorService.validate(instance);
```

## Custom Validations

It's always a good idea to be able to customise validations, so here is our solution:

```typescript
import { Service, Inject } from "@bluelibs/core";
import {
  yup,
  IValidationMethod,
  TestContext,
} from "@bluelibs/validator-bundle";

export type UniqueFieldConfig = {
  message?: string;
  table: string;
  field: string;
};

@Service()
class UniqueFieldValidator implements IValidationMethod<UniqueFieldConfig> {
  // What is your string like, which you want to validate?
  parent = yup.string; // optional, defaults to yup.mixed, so to all
  name = "uniqueField";

  constructor() {
    // Note that you can inject any dependency in the constructor, in our case, a database or api service
  }

  async validate(
    value: string,
    config: IUniqueFieldValidationConfig,
    context: TestContext
  ) {
    // The 3d argument, the context, can be found here:
    // https://github.com/jquense/yup#mixedtestname-string-message-string--function-test-function-schema

    const { table, field, message } = config;
    let valueAlreadyExists; /* search to see if that field exists */

    if (valueAlreadyExists) {
      // This does not actually throw so the execution will continue
      context.createError(message || `The field already exists`);
    } else {
      // This is yup's way of saying the validation has worked ok.
      return true;
    }
  }
}
```

And ensure TypeScript knows about this:

```typescript
// declarations.ts
import * as yup from "yup";
import { IUniqueFieldValidationConfig } from "./validator.ts";

/**
 * We need to be able to have autocompletion and extend the "yup" from within our validator.
 */
declare module "yup" {
  export class StringSchema extends yup.StringSchema {
    /**
     * Specify a unique constraint for this field
     */
    uniqueField(config?: IUniqueFieldValidationConfig): StringSchema;
  }
}
```

You now have to register the method, you add this in the prepare() phase of your bundle:

```typescript
const validatorService = container.get(ValidatorService);

validatorService.addMethod(UniqueFieldValidationMethod);
```

Now you could safely use it like this:

```typescript
@Schema()
class UserRegistrationInput {
  @Is(
    a.string().email().uniqueField({
      table: "users",
      field: "email",
    })
  )
  email: string;
}
```

## Transformer

Now let's say you receive from inputs a date, but not an object date, a string, "2018-12-04" you want to make it a date, so you would want to typecast it. That's done via transformers

```typescript
import * as moment from "moment";
import { yup, IValidationTransformer } from "@bluelibs/validator-bundle";

type IDateTransformerConfig = string;

class DateTransformer implements IValidationTransformer<IDateTransformerConfig, Date> {
  // What is your string like, which you want to validate?
  parent = yup.date, // optional, defaults to yup.mixed, so to all
  name = "format";

  // Note that this is not async
  // Transformers do not support async out of the box in yup
  transform(value: string, originalValue, format, schema) {
    if (value instanceof Date) {
      return value;
    }

    const date = moment(value, format || 'YYYY-MM-DD');

    return date.isValid() ? date.toDate() : new Date();
  }
}
```

You can add it to TypeScript declarations in the same manner as we've seen for the Validator above.

```typescript
const validatorService = container.get(ValidatorService);
validatorService.addTransformer(DateTransformer);
```

Now you could safely use it like this:

```typescript
@Schema()
class PostCreateInput {
  @Is(a.date().format())
  publishAt: Date;
}

const input = {
  publishAt: "2050-12-31", // Remember this date.
};

const object = validatorService.validate(input, {
  model: PostCreateInput,
});

// Casting has been doen automatically, if you want just casting: validatorService.cast(input)
object.publishAt; // instanceof Date now
```
