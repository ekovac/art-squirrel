import * as requestPromise from 'request-promise-native';
import * as request from 'request';

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

export interface Submission {
    readonly id: string;
    readonly site: string;
    imageContent(): Promise<Uint8Array>;
    metadata(): Promise<SubmissionMetadata>;
}

export interface SiteConfig {
    collectionTarget: string|string[];
};

export interface Site {
    readonly name: string;
    favorites(): AsyncIterableIterator<Submission>;
};

export abstract class Fetchable {
    url: string;
    headers: request.Headers;
    private contentPromise: Promise<string>;
    content(): Promise<string> {
        if (!this.contentPromise)
            this.contentPromise = requestPromise({url: this.url, headers: this.headers});
        return this.contentPromise;
    }
}

/* Collection configuration types */

export interface CollectionConfig {
  collectionId: string; // For reference by SiteConfig.collectionTarget
};

export interface Collection {
  get(submissionId: string): Submission;
  store(submission: Submission): Promise<void>;
  listIds(): Promise<string[]>;
  list?(): Promise<Submission[]>;
};
