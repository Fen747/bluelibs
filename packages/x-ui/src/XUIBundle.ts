import {
  Bundle,
  BundlePhase,
  EventManager,
  KernelAfterInitEvent,
  KernelBeforeInitEvent,
  KernelPhase,
} from "@bluelibs/core";
import { setDefaults } from "@bluelibs/smart";
import { InMemoryCache } from "@apollo/client/core";

import { XUIBundleConfigType } from "./defs";
import {
  APOLLO_CLIENT_OPTIONS_TOKEN,
  XUI_CONFIG_TOKEN,
  XUI_COMPONENTS_TOKEN,
} from "./constants";
import { RoutingPreparationEvent } from "./events/RoutingPreparationEvent";
import { XRouter } from "./react/XRouter";
import { ApolloClient } from "./graphql/ApolloClient";
import { GuardianSmart } from "./react/smarts/GuardianSmart";
import { DefaultComponents, IComponents } from "./react/components/types";
import { I18NConfig, I18NService } from "./react/services/I18N.service";

export class XUIBundle extends Bundle<XUIBundleConfigType> {
  protected defaultConfig: XUIBundleConfigType = {
    graphql: {},
    guardianClass: GuardianSmart,
    enableSubscriptions: true,
    react: {
      components: DefaultComponents,
    },
    session: {
      localStorageKey: "BLUELIBS_SESSION",
    },
    i18n: {
      defaultLocale: "en",
      polyglots: [],
    },
  };

  async validate(config: XUIBundleConfigType) {
    if (!config.graphql?.uri) {
      throw new Error(
        `You have to provide a valid 'graphql.uri' for it to connect to the GraphQL API`
      );
    }
  }

  async hook() {
    const eventManager = this.container.get(EventManager);
    const router = this.container.get(XRouter);

    // After the kernel has passed through all intialisation of all bundles and all routes have been added
    // It's time to hook into them and have extensions for configuration
    eventManager.addListener(
      KernelAfterInitEvent,
      async (e: KernelBeforeInitEvent) => {
        await eventManager.emit(
          new RoutingPreparationEvent({
            routes: router.store,
          })
        );
      }
    );
  }

  async prepare() {
    if (!this.config.graphql.cache) {
      this.config.graphql.cache = new InMemoryCache({
        dataIdFromObject: (object) => (object?._id as string) || null,
      }).restore((window as any).__APOLLO_STATE__ || {});
    }

    this.container.set(XUI_COMPONENTS_TOKEN, this.config.react.components);
    this.container.set(XUI_CONFIG_TOKEN, this.config);
    this.container.set({
      id: APOLLO_CLIENT_OPTIONS_TOKEN,
      value: this.config.graphql,
    });
  }

  async init() {
    const container = this.container;
    setDefaults({
      factory(targetType, config) {
        return container.get(targetType);
      },
    });
  }

  /**
   * You can set the guardian before it has been prepared
   * @param guardianClass
   */
  setGuardianClass(guardianClass: { new (): GuardianSmart }) {
    const phase = this.kernel.getPhase();
    if ([KernelPhase.PREPARING, KernelPhase.INITIALISING].includes(phase)) {
      this.config.guardianClass = guardianClass;
    } else {
      throw new Error(
        `You cannot set the guardian at this stage, do it before the bundle is initialised.`
      );
    }
  }

  /**
   * Use this in the prepare or init phase to update certain UI Components
   * @param components
   */
  updateComponents(components: Partial<IComponents>) {
    Object.assign(this.config.react.components, components);
  }

  /**
   * Store one or multiple i18n configurations
   * @param i18n
   */
  storeI18N(i18n: I18NConfig | I18NConfig[]) {
    this.container.get(I18NService).store(i18n);
  }
}
