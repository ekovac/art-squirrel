import {Site, CommonSiteConfig, SubmissionMetadata, Submission, Fetchable, fetch} from '../sites';
import * as Cheerio from 'cheerio';
import * as request from 'request';
import * as requestPromise from 'request-promise-native';

export type FuraffinityConfig = {
    collectionPath: string;
    targetUser?: string;
    username?: string;
    password?: string;
    cookie_location?: string;
}

const BASE_URL = "https://furaffinity.net";
const USER_AGENT = "art-squirrel/0.1";

class FuraffinityContext {
    constructor(readonly config: FuraffinityConfig) {
    }

    get headers(): request.Headers {
        return {};
    }

    get targetUser(): string {
        return this.config.targetUser || this.config.username;
    }
}

class FuraffinitySubmission implements Submission, Fetchable {
    private root: Cheerio;
    constructor(readonly context: FuraffinityContext, readonly id: string) {
    }

    get url(): string {
        return `${BASE_URL}/view/${this.id}`;
    }
    get headers(): request.Headers {
        return this.context.headers;
    }

    get metadata(): Promise<SubmissionMetadata> {
       return Promise.resolve({imageUrl: "", dateUploaded: new Date(), artist: {name: ""}, tags: new Set()});
    }

    get imageContent(): Promise<Uint8Array> {
        return Promise.resolve(new Uint8Array(0));
    }
}

class FuraffinityFavoritesPage implements Fetchable {
    private root: Cheerio;
    constructor(
        private readonly context: FuraffinityContext,
        private readonly pageNumber: number
    ) {
    }

    get url() {
        return `${BASE_URL}/favorites/${this.context.targetUser}/${this.pageNumber}`;
    }
    get headers() {
        return this.context.headers;
    }

    parse(content: string) {
        this.root = cheerio.load(content).root();
        return this;
    }
    
    get isLastPage(): boolean {
        return true;
    }

    async *submissions() {
        let figures = this.root.find('figure').toArray();
        for (const figure of figures) {
            const id = figure.attribs['id'].split('-')[1];
            yield new FuraffinitySubmission(this.context, id);
        }
    }
}

export class FuraffinitySite implements Site {
    private context: FuraffinityContext;
    constructor(readonly config: FuraffinityConfig) {
        this.context = new FuraffinityContext(config);
    }

    private async *favoritePages(): AsyncIterableIterator<FuraffinityFavoritesPage> {
        let pageNumber = 1;
        let page: FuraffinityFavoritesPage = null;
        do {
            page = new FuraffinityFavoritesPage(this.context, pageNumber++);
            yield page;
        } while (!page.isLastPage);
    }

    async *favorites() {
        for await (const page of this.favoritePages()) {
            yield* page.submissions();
        }
    }
}

