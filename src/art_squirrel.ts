import { Config, PluginConfig, loadConfig } from "./config";
import { makeSite, makeCollection } from "./plugin_registry";
import { SubmissionMetadata, APPNAME, Site, Collection } from "./common";
import { Filesystem } from "./collections/filesystem";

function makePlugins<T, S>(
  entries: PluginConfig[],
  nameMapping: Map<string, T>,
  configPath: string,
  builder: (type: string, config: S, configPath: string) => T
) {
  for (const entry of entries) {
    const name = entry.name || entry.type;
    if (nameMapping.has(name)) {
      console.error("Duplicate configuration name '%s'", name);
    } else {
      const plugin = builder(entry.type, entry.config, configPath);
      nameMapping.set(name, plugin);
    }
  }
}

export class ArtSquirrel {
  readonly siteNames = new Map<string, Site>();
  readonly collectionNames = new Map<string, Collection>();
  readonly inputsToOutputs = new Map<Site, Collection[]>();
  constructor(readonly config: Config, readonly configPath: string) {
    makePlugins(config.sites, this.siteNames, configPath, makeSite);
    makePlugins(
      config.collections,
      this.collectionNames,
      configPath,
      makeCollection
    );
    console.log(this.siteNames);
    console.log(this.collectionNames);
    this.resolveTargets();
  }

  resolveTargets() {
    for (const [name, site] of this.siteNames.entries()) {
      const outputs = this.inputsToOutputs.get(site) || [];
      this.inputsToOutputs.set(site, outputs);
      for (const target of site.config.target) {
        const collection = this.collectionNames.get(target);
        if (collection) {
          outputs.push(collection);
        } else {
          console.error(
            "Configuration for '%s' refers to nonexistent target '%s'.",
            name,
            site.config.target
          );
          process.abort();
        }
      }
    }
  }
}
