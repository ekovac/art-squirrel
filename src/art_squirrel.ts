import { Config, PluginConfig, loadConfig } from "./config";
import { makeSite, makeCollection } from "./plugin_registry";
import { APPNAME, Site, Collection, SubmissionIdentifier } from "./common";
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
    this.resolveTargets();
  }

  async identifyExistingSubmissions(
    site: string,
    outputs: Collection[]
  ): Promise<Map<Collection, Set<string>>> {
    const outputExistingSubmissions = new Map<Collection, Set<string>>();
    for (const collection of outputs) {
      const existingSubmissions = await collection.listIds();

      for (const submissionId of existingSubmissions) {
        if (submissionId.site != site) continue;
        const set =
          outputExistingSubmissions.get(collection) || new Set<string>();
        set.add(submissionId.id);
        outputExistingSubmissions.set(collection, set);
      }
    }
    return outputExistingSubmissions;
  }

  async process() {
    for (const [site, collections] of this.inputsToOutputs.entries()) {
      const existingSubmissionsByCollection = await this.identifyExistingSubmissions(
        Object.getPrototypeOf(site).constructor.name,
        collections
      );
      console.log(existingSubmissionsByCollection);
      for await (const submission of site.submissions()) {
        for (const collection of collections) {
          const existingSubmissions =
            existingSubmissionsByCollection.get(collection) || new Set();
          // TODO: Add commandline param to force fetching, or to abort fetching on the first already-fetched submission.
          if (!existingSubmissions.has(submission.id)) {
            const poorMansThrottle = new Promise((resolve, reject) => {
              setTimeout(() => {
                resolve();
              }, 500);
            });
            await poorMansThrottle;
            await collection.store(submission);
          } else {
            console.log(
              "Skipped submission {%s,%s}",
              submission.site,
              submission.id
            );
          }
        }
      }
    }
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
