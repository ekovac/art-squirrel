import { Config } from "./config";
import { Site, Collection, SiteConfig, CollectionConfig } from "./common";
import { Schema, Validator } from "jsonschema";

type PluginConstructor<C, T> = {
  new (config: C, configPath: string): T;
};

type SiteConstructor = PluginConstructor<SiteConfig, Site>;
type CollectionConstructor = PluginConstructor<CollectionConfig, Collection>;

const siteRegistry = new Map<string, [Schema, SiteConstructor]>();
const collectionRegistry = new Map<string, [Schema, CollectionConstructor]>();

export function SITE(configSchema: Schema) {
  return (constructor: SiteConstructor) => {
    siteRegistry.set(constructor.name.toLowerCase(), [
      configSchema,
      constructor
    ]);
  };
}

export function COLLECTION(configSchema: Schema) {
  return (constructor: CollectionConstructor) => {
    collectionRegistry.set(constructor.name.toLowerCase(), [
      configSchema,
      constructor
    ]);
  };
}

function makePlugin<X, C extends {}, T extends PluginConstructor<C, X>>(
  name: string,
  config: C,
  configPath: string,
  registry: Map<string, [Schema, T]>
): X {
  name = name.toLowerCase();
  if (!registry.has(name)) {
    console.error("No such plugin: '%s'", name);
    process.abort();
  }
  const [schema, constructor] = registry.get(name);
  const v = new Validator();
  const results = v.validate(config, schema);
  if (!results.valid) {
    console.error("Configuration for '%s' invalid", name);
    for (const error in results.errors) {
      console.error(error);
      process.abort();
    }
  }
  return new constructor(config, configPath);
}

export function makeSite(
  name: string,
  config: SiteConfig,
  configPath: string
): Site {
  return makePlugin(name, config, configPath, siteRegistry);
}

export function makeCollection(
  name: string,
  config: CollectionConfig,
  configPath: string
): Collection {
  return makePlugin(name, config, configPath, collectionRegistry);
}
