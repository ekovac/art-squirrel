import * as requestPromise from 'request-promise-native';
import * as request from 'request';

export interface CollectionEntry {
  id?: string,
  type: string,
  config: CollectionConfig,
}

export interface SiteEntry {
  id?: string,
  type: string,
  config: SiteConfig,
}

export interface Config {
  collections: CollectionEntry[],
  sites: SiteEntry[],
}

/* Module registry */

class Map2D<K1, K2, V> {
  private readonly map = new Map<K1, Map<K2, V>>();

  constructor(initializer?: [K1, K2, V][]) {
    if (initializer) {
      for (const [k1, k2, v] of initializer) {
        this.set(k1, k2, v);
      }
    }
  }

  set(k1: K1, k2: K2, v: V): this {
    let topLevel = this.map.get(k1) || new Map();
    this.map.set(k1, topLevel);
    topLevel.set(k2, v);
    return this;
  }

  get(k1: K1, k2: K2): V {
    let topLevel = this.map.get(k1);
    if (topLevel) {
      return topLevel.get(k2);
    }
    return undefined;
  }

  topKeys(): IterableIterator<K1> {
    return this.map.keys();
  }

  *allKeys(): IterableIterator<[K1, K2]> {
    for (const k1 of this.map.keys()) {
      for (const k2 of this.map.get(k1).keys()) {
        yield [k1, k2];
      }
    }
  }

  clear() {
    this.map.clear();
  }
}

export const SITE = "site";
export const COLLECTION = "collection";
export const FILETYPE = "filetype";
export type ModuleType = typeof SITE|typeof COLLECTION|typeof FILETYPE;
type CONSTRUCTOR = {new(...args:any[]):{}};

export const sharedRegistry = new Map2D<ModuleType, string, CONSTRUCTOR>();

export function register(typ: ModuleType) {
  return (constructor: CONSTRUCTOR) => {
      sharedRegistry.set(typ, constructor.name as string, constructor);
  }
}

export function instantiate(typ: ModuleType, name: string, ...args:any[]): any {
  const constructor = sharedRegistry.get(typ, name);
  return new constructor(...args);
}

export function debugRegistry() {
  for (const entry of sharedRegistry.allKeys()) {
    console.log(entry);
  }
}

export interface SubmissionMetadata {
    imageUrl: string;
    title: string;
    dateUploaded: Date;
    artist: {
        name: string,
        url?: string,
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
    target: string|string[];
    [key: string]: any,
};

export interface Site {
    favorites(): AsyncIterableIterator<Submission>;
};

export abstract class Fetchable {
    url: string;
    headers: request.Headers;
    private contentPromise: Promise<Buffer>|null;
    content(): Promise<Buffer> {
        if (!this.contentPromise)
            this.contentPromise = requestPromise({url: this.url, headers: this.headers, encoding: null});
        return this.contentPromise;
    }
}

/* Collection configuration types */

export interface CollectionConfig {
  id?: string; // For reference by SiteConfig.collectionTarget
  [key: string]: any,
};

export interface Collection {
  get?(submissionId: SubmissionIdentifier): Submission;
  store(submission: Submission): Promise<void>;
  listIds(): Promise<SubmissionIdentifier[]>;
  list?(): Promise<Submission[]>;
};
