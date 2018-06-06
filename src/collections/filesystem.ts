import { APP_JAVA_NAMESPACE } from "../common";
import { Collection, CollectionConfig } from "../core/collection";
import {
  Submission,
  SubmissionIdentifier,
  SubmissionMetadata
} from "../core/submission";
import { objectToMap } from "../util/map";
import { COLLECTION } from "../plugin_registry";
import * as fs from "fs-extra";
import * as xattr from "../util/xattr";
import * as path from "path";
import * as process from "process";
import { processForOutput, processForInput } from "../core/filetypes";
import { Schema } from "jsonschema";

export interface FilesystemConfig extends CollectionConfig {
  path?: string;
}

interface IdentifierHinter {
  getIdentifierHint: (filePath: string) => Promise<SubmissionIdentifier>;
  setIdentifierHint: (
    filePath: string,
    id: SubmissionIdentifier
  ) => Promise<void>;
}

const CONFIG_SCHEMA: Schema = {
  id: "FilesystemConfig",
  type: "object",
  properties: {
    path: { type: "string" }
  }
};

const ID_PROPERTY = `${APP_JAVA_NAMESPACE}.id`;
const SITE_PROPERTY = `${APP_JAVA_NAMESPACE}.site`;

const xattrHinter: IdentifierHinter = {
  getIdentifierHint: async resource => {
    const id = await xattr.get(resource, ID_PROPERTY);
    const site = await xattr.get(resource, SITE_PROPERTY);
    return { id, site, resource };
  },
  setIdentifierHint: async (resource, identifier) => {
    await xattr.set(resource, ID_PROPERTY, identifier.id);
    await xattr.set(resource, SITE_PROPERTY, identifier.site);
  }
};

const filenameHinter: IdentifierHinter = {
  getIdentifierHint: async resource => {
    const extension = path.extname(resource);
    const baseName = path.basename(resource, extension);
    const [site, id] = baseName.split(" ", 2);
    return { site, id };
  },
  setIdentifierHint: async (resource, identifier) => {
    return;
  }
};

@COLLECTION(CONFIG_SCHEMA)
export class Filesystem extends Collection {
  constructor(private readonly config: FilesystemConfig) {
    super();
    config.path = config.path || path.join(process.env.HOME, "Pictures");
  }

  async setIdentifierHint(
    id: SubmissionIdentifier,
    filename: string
  ): Promise<void> {}

  async fetch(resource: string): Promise<Submission> {
    return await processForInput(resource, fs.readFile(resource));
  }

  async store(submission: Submission) {
    let metadata: SubmissionMetadata;
    try {
      metadata = await submission.metadata();
    } catch (e) {
      console.error(e);
      return;
    }
    const extIndex = metadata.imageUrl.lastIndexOf(".");
    let naiveExtension = "jpg";
    if (extIndex != -1 && extIndex < metadata.imageUrl.length - 1) {
      naiveExtension = metadata.imageUrl.slice(extIndex + 1);
    }
    const fileBaseName = `${submission.site} ${submission.id}`;
    const outputPathNoExtension = path.join(this.config.path, fileBaseName);

    /* TODO: Examine filetype modules, embed info based on filetype */

    const { content, ext } = await processForOutput(submission);
    const finalOutputPath = [outputPathNoExtension, ext].join(".");
    return fs.writeFile(finalOutputPath, content);
  }

  async getIdentifier(resource: string): Promise<SubmissionIdentifier> {
    let identifier: SubmissionIdentifier = null;
    for (const hinter of [xattrHinter, filenameHinter]) {
      if (identifier) break;
      try {
        identifier = await hinter.getIdentifierHint(resource);
      } catch (e) {
        /* Do nothing */
      }
    }
    return identifier;
  }

  async list(): Promise<SubmissionIdentifier[]> {
    const files = await fs.readdir(this.config.path);
    return Promise.all(files.map(this.getIdentifier));
  }
}
