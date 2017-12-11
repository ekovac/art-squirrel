import { APPNAME } from "./common";
import * as osPath from "path";
import * as fs from "fs";
import * as jsonschema from "jsonschema";

const validator = new jsonschema.Validator();

const pluginConfigSchema: jsonschema.Schema = {
  id: "/PluginConfig",
  type: "object",
  properties: {
    type: { type: "string" },
    name: { type: "string" },
    config: { type: "object" }
  },
  required: ["type", "config"]
};

const configSchema: jsonschema.Schema = {
  id: "Config",
  type: "object",
  properties: {
    sites: {
      type: "array",
      items: { $ref: pluginConfigSchema.id }
    },
    collections: {
      type: "array",
      items: { $ref: pluginConfigSchema.id }
    }
  }
};

export interface PluginConfig {
  type: string;
  name?: string;
  config: any;
}
export interface Config {
  collections: PluginConfig[];
  sites: PluginConfig[];
}

validator.addSchema(pluginConfigSchema, pluginConfigSchema.id);

export function loadConfig(): { config: Config; path: string } {
  const configSearchPaths = [
    osPath.join(global.process.env.HOME, ".config", APPNAME, "config.json"),
    osPath.join(global.process.cwd(), "config.json")
  ];
  let config: Config;

  for (const path of configSearchPaths) {
    let configContent: string;
    try {
      configContent = fs.readFileSync(path, { encoding: "utf-8" });
    } catch (e) {
      continue; // Try next path.
    }
    try {
      config = JSON.parse(configContent);
    } catch (e) {
      console.error(
        "Tried to load config at %s, contained invalid JSON: %s",
        path,
        e
      );
      process.abort();
    }
    const result = validator.validate(config, configSchema);
    if (!result.valid) {
      console.error("Invalid configuration specified:");
      for (const error of result.errors) {
        console.error(error.message);
      }
      process.abort();
    }
    return { config, path };
  }

  if (!config) {
    console.error("No valid configuration found.");
    process.abort();
  }
}
