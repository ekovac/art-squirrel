import {
  Collection,
  CollectionConfig,
  Submission,
  SubmissionIdentifier,
  SubmissionMetadata
} from "../common";
import { COLLECTION } from "../plugin_registry";
import * as fs from "fs-extra";
import * as path from "path";
import * as process from "process";
import { processForOutput } from "../filetypes/filetypes";
import { Schema } from "jsonschema";

export interface FilesystemConfig extends CollectionConfig {
  path?: string;
}

const CONFIG_SCHEMA: Schema = {
  id: "FilesystemConfig",
  type: "object",
  properties: {
    path: { type: "string" }
  }
};

@COLLECTION(CONFIG_SCHEMA)
export class Filesystem implements Collection {
  constructor(private readonly config: FilesystemConfig) {
    config.path = config.path || path.join(process.env.HOME, "Pictures");
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

  async listIds(): Promise<SubmissionIdentifier[]> {
    const files = await fs.readdir(this.config.path);
    const identifiers = new Array<SubmissionIdentifier>();
    for (const filePath of files) {
      const extension = path.extname(filePath);
      const baseName = path.basename(filePath, extension);
      const [site, id] = baseName.split(" ", 2);
      identifiers.push({ site, id });
    }
    return identifiers;
  }
}
