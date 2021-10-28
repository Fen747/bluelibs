<<<<<<< HEAD
<<<<<<< HEAD:packages/x-ui-router/src/react/XCoreRouter.ts
import { IRoute, IRouteGenerationProps, IRouteParams } from "../defs";
import { Service } from "@bluelibs/core";
import * as queryString from "query-string";

export type AddRoutingArguments<T> = {
  [routeName: string]: T;
};

@Service()
export abstract class XCoreRouter<
  RT extends IRoute,
  RP extends IRouteParams = IRouteParams
> {
  store: RT[] = [];

  /**
   * Add routes in the form of { [name]: config }
   * @param routes
   */
  add(routes: AddRoutingArguments<RT>) {
=======
import { Service } from "@bluelibs/core";
import {
  AddRoutingArguments,
  IRoute,
  IRouteGenerationProps,
  IRouteParams,
  XCoreRouter,
} from "@bluelibs/x-ui-router";

import * as H from "history";
import * as queryString from "query-string";
import { createBrowserHistory } from "history";

@Service()
export class XRouter extends XCoreRouter {
  store: IRoute[] = [];
  history: H.History;

  constructor() {
    super();
    this.history = createBrowserHistory();
  }

  add(routes: AddRoutingArguments) {
    // TODO: sanity check not to add after kernel initialisation

>>>>>>> 047d18a ((initial changes)):packages/x-ui-react-router-bundle/src/react/XRouter.tsx
    for (const routeName in routes) {
      const route = {
        exact: true,
        name: routeName,
        ...routes[routeName],
      };

      this.checkRouteConsistency(route);
      this.store.push(route);
    }
  }

  find(routeNameOrPath: string): RT | null {
    const found = this.store.find((r) => r.path === routeNameOrPath);

    if (found) {
      return found;
    }

    return this.store.find((r) => r.name === routeNameOrPath);
  }

  /**
   * Generate the path
   * @param route
   * @param options
   * @returns
   */
  path<T extends RP, Q extends RP>(
    route: IRoute<T, Q>,
    options?: IRouteGenerationProps<T, Q>
  ): string {
    let finalPath = route.path;
    let queryPath = "";

    if (options?.params) {
      for (const key in options.params) {
        if (finalPath.indexOf(`:${key}`) > -1) {
          finalPath = finalPath.replace(
            `:${key}`,
            options.params[key] as string
          );
        } else {
          throw new Error(
            `Parameter "${key}" does not exist in the route path definition.`
          );
        }
      }

      if (options?.query && Object.keys(options.query).length) {
        queryPath = queryString.stringify(options.query);
      }
    }

    return finalPath + queryPath;
  }

  abstract go<T extends RP, Q extends RP>(
=======
import { IRoute, IRouteGenerationProps, IRouteParams } from "../defs";
import { Service } from "@bluelibs/core";

export type AddRoutingArguments = {
  [routeName: string]: IRoute;
};

@Service()
export abstract class XCoreRouter {
  abstract add(routes: AddRoutingArguments): void;

  abstract find(routeNameOrPath: string): IRoute | null;

  abstract path<T extends IRouteParams, Q extends IRouteParams>(
    route: IRoute<T, Q>,
    options?: IRouteGenerationProps<T, Q>
  ): string;

  abstract go<T extends IRouteParams, Q extends IRouteParams>(
>>>>>>> 047d18a ((initial changes))
    route: IRoute<T, Q>,
    options?: IRouteGenerationProps<T, Q>
  ): void;

  /**
   * This method is used to ensure that you do not have duplicated routes
   */
<<<<<<< HEAD
  protected checkRouteConsistency(route: RT) {
    // Ensure that there isn't another route with the same path or name
    const found = this.store.find((r) => {
      if (r.path === route.path) {
        return r;
      }
      // Name can often be null
      if (route.name && r.name === route.name) {
        return r;
      }
    });

    if (!found) {
      return;
    }

    const foundString = JSON.stringify(found);

    throw new Error(
      `We cannot add the route: ${route.name}:${route.path} because there's another route has the same name or path: ${foundString}`
    );
  }
=======
  protected checkRouteConsistency(route: IRoute) {}
>>>>>>> 047d18a ((initial changes))
}
