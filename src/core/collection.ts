import { Submission, SubmissionIdentifier } from "./submission";

/* Collection configuration types */

export interface CollectionConfig {
  id?: string; // For reference by SiteConfig.collectionTarget
  [key: string]: any;
}

export interface CollectionEntry {
  id?: string;
  type: string;
  config: CollectionConfig;
}

export abstract class Collection {
  async get(identifier: SubmissionIdentifier): Promise<Submission> {
    const entries = await this.list();
    for (const entry of entries) {
      if (entry.id == identifier.id && entry.site == identifier.site) {
        return this.fetch(entry.resource);
      }
    }
    return Promise.reject(
      `No such submission ${identifier.site}:${identifier.id}`
    );
  }
  abstract store(submission: Submission): Promise<void>;
  abstract fetch(resource: string): Promise<Submission>;
  abstract list(): Promise<SubmissionIdentifier[]>;
}
