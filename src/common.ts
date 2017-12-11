import * as requestPromise from "request-promise-native";
import * as request from "request";

export const APPNAME = "art-squirrel";

export interface CollectionEntry {
  id?: string;
  type: string;
  config: CollectionConfig;
}

export interface SiteEntry {
  id?: string;
  type: string;
  config: SiteConfig;
}

export interface SubmissionMetadata {
  imageUrl: string;
  title: string;
  dateUploaded: Date;
  artist: {
    name: string;
    url?: string;
  };
  tags: Map<string, string>;
}

export interface SubmissionIdentifier {
  readonly id: string;
  readonly site: string;
}

export interface Submission extends SubmissionIdentifier {
  image(): Promise<Fetchable>;
  metadata(): Promise<SubmissionMetadata>;
}

export interface SiteConfig {
  target: string[];
  query: string[];
  [key: string]: any;
}

export interface Site {
  readonly config: SiteConfig;
  submissions(): AsyncIterableIterator<Submission>;
}

export abstract class Fetchable {
  url: string;
  headers: request.Headers;
  private contentPromise: Promise<Buffer> | null;
  content(): Promise<Buffer> {
    if (!this.contentPromise)
      this.contentPromise = requestPromise({
        url: this.url,
        headers: this.headers,
        encoding: null
      });
    return this.contentPromise;
  }
}

/* Collection configuration types */

export interface CollectionConfig {
  id?: string; // For reference by SiteConfig.collectionTarget
  [key: string]: any;
}

export interface Collection {
  get?(submissionId: SubmissionIdentifier): Submission;
  store(submission: Submission): Promise<void>;
  listIds(): Promise<SubmissionIdentifier[]>;
  list?(): Promise<Submission[]>;
}
