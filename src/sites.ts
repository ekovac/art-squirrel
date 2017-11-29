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

export interface Fetchable {
    url: string;
    headers: request.Headers;
}

export function fetch<T extends Fetchable>(obj: T): Promise<string> {
    return requestPromise({url: obj.url, headers: obj.headers});
}
