export interface IElement {
  id: string;
  title: string;
  package?: string;
  /**
   * Default is `DOCUMENTATION.md` if different from it specify
   */
  file?: string;
  typeDocs?: boolean;
}

export interface IElementGroup {
  groupLabel: string;
  elements: IElement[];
}

export function isElementGroup(arg: any): arg is IElementGroup {
  return typeof arg.groupLabel === "string";
}
export function isElementSingle(arg: any): arg is IElement {
  return arg.groupLabel === undefined;
}

export type ElementOrElementGroup = IElement | IElementGroup;

export interface IElementMap {
  [key: string]: IElement | Array<ElementOrElementGroup>;
}

export const map: IElementMap = {
  Meta: [
    {
      id: "framework-introduction",
      title: "Introduction to BlueLibs",
    },
  ],
  Foundation: [
    {
      id: "core",
      title: "Core",
      package: "core",
      typeDocs: true,
    },
    {
      groupLabel: "Database",
      elements: [
        {
          id: "database-introduction",
          title: "Introduction to Databases",
        },
        {
          id: "mongo",
          title: "MongoDB",
          package: "mongo-bundle",
          typeDocs: true,
        },
        {
          id: "sql",
          title: "SQL",
          package: "mikroorm-bundle",
          typeDocs: true,
        },
      ],
    },
    {
      groupLabel: "Security",
      elements: [
        {
          id: "security",
          title: "Security",
          package: "security-bundle",
          typeDocs: true,
        },
        {
          id: "security-mongo",
          title: "Security with MongoDB",
          package: "security-mongo-bundle",
          typeDocs: true,
        },
        {
          id: "password-bundle",
          title: "Password Strategy",
          package: "password-bundle",
          typeDocs: true,
        },
      ],
    },
    {
      groupLabel: "GraphQL",
      elements: [
        {
          id: "graphql",
          title: "Basics",
          package: "graphql-bundle",
          typeDocs: true,
        },
        {
          id: "apollo",
          title: "Apollo",
          package: "apollo-bundle",
          typeDocs: true,
        },
        {
          id: "apollo-security",
          title: "Apollo Security",
          package: "apollo-security-bundle",
          typeDocs: true,
        },
      ],
    },
    {
      id: "queue",
      title: "Message Queues",
      package: "rabbitmq-bundle",
      typeDocs: true,
    },
    {
      id: "http-server",
      title: "HTTP Server",
      package: "http-bundle",
      typeDocs: true,
    },
    {
      id: "validator-bundle",
      title: "Validation",
      package: "validator-bundle",
      typeDocs: true,
    },
    {
      id: "logger",
      title: "Logger",
      package: "logger-bundle",
      typeDocs: true,
    },
    {
      id: "ejson",
      title: "EJSON",
      package: "ejson",
      typeDocs: true,
    },
    {
      id: "emails",
      title: "Emails",
      package: "email-bundle",
      typeDocs: true,
    },
    {
      id: "terminal",
      title: "Terminal",
      package: "terminal-bundle",
      typeDocs: true,
    },
  ],
  Nova: {
    id: "nova",
    title: "Nova",
    package: "nova",
  },
  "X-Framework": [
    {
      id: "x-framework-introduction",
      title: "Introduction",
    },
    {
      groupLabel: "Server",
      elements: [
        {
          id: "x-bundle",
          title: "Core",
          package: "x-bundle",
        },
        {
          id: "x-cli",
          title: "Command-line",
          package: "x",
        },
        {
          id: "x-cron-bundle",
          title: "Cronjobs",
          package: "x-cron-bundle",
        },
        {
          id: "x-password-bundle",
          title: "Passwords",
          package: "x-password-bundle",
        },
        {
          id: "x-s3-uploads",
          title: "Uploads",
          package: "x-s3-bundle",
        },
      ],
    },
    {
      groupLabel: "UI",
      elements: [
        {
          id: "x-ui",
          title: "Core",
          package: "x-ui",
        },
        {
          id: "x-ui-admin",
          title: "Administration",
          package: "x-ui-admin",
        },
        {
          id: "smart",
          title: "Smart",
          package: "smart",
        },
      ],
    },
    {
      id: "x-framework-deployment",
      title: "Deployment",
    },
  ],

  Blueprint: {
    id: "blueprint",
    title: "Blueprint",
    package: "x",
    file: "BLUEPRINT.md",
  },
};
