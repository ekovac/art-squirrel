import {Site, CommonSiteConfig, SubmissionMetadata, Submission, Fetchable} from '../sites';
import * as cheerio from 'cheerio';
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

abstract class FuraffinityFetchable extends Fetchable {
    readonly context: FuraffinityContext;
    url: string;
    get headers(): request.Headers {
        return this.context.headers;
    }
}

class FuraffinitySubmission extends FuraffinityFetchable implements Submission {
    private root: Cheerio;
    constructor(readonly context: FuraffinityContext, readonly id: string) {
        super();
    }

    get url(): string {
        return `${BASE_URL}/view/${this.id}`;
    }

    get metadata(): Promise<SubmissionMetadata> {
       return Promise.resolve({imageUrl: "", dateUploaded: new Date(), artist: {name: ""}, tags: new Set()});
    }

    get imageContent(): Promise<Uint8Array> {
        return Promise.resolve(new Uint8Array(0));
    }
}

class FuraffinityFavoritesPage extends FuraffinityFetchable {
    constructor(
        readonly context: FuraffinityContext,
        readonly pageNumber: number
    ) {
        super();
    }

    get url() {
        return `${BASE_URL}/favorites/${this.context.targetUser}/${this.pageNumber}`;
    }

    async root() {
        return cheerio.load(await this.content()).root();
    }
 
    async isLastPage(): Promise<boolean> {
        return (await this.root()).find('.button-link.right.inactive').length == 0;
    }

    async *submissions() {
        console.log(this.url);
        let figures = (await this.root()).find('figure').toArray();
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
        } while (await page.isLastPage());
    }

    async *favorites() {
        for await (const page of this.favoritePages()) {
            yield* page.submissions();
        }
    }
}

