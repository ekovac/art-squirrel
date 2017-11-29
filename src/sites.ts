import * as requestPromise from 'request-promise-native';
import * as request from 'request';

export interface SubmissionMetadata {
    imageUrl: string;
    dateUploaded: Date;
    artist: {
        name: string,
        url?: string,
    };
    tags: Set<string>;
}

export interface Submission {
    readonly id: string;
    imageContent: Promise<Uint8Array>;
    metadata: Promise<SubmissionMetadata>;
}

export interface CommonSiteConfig {
    collectionPath: string
};

export interface Site {
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
