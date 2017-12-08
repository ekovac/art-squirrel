import {
  register,
  SITE,
  Site,
  SiteConfig,
  SubmissionMetadata,
  Submission,
  Fetchable
} from "../common";
import * as cheerio from "cheerio";
import * as request from "request";
import * as moment from "moment";
import * as requestPromise from "request-promise-native";
import * as nodeUrl from "url";

export interface FuraffinityConfig extends SiteConfig {
  targetUser?: string;
  username?: string;
  password?: string;
  cookie_location?: string;
}

const BASE_URL = "https://furaffinity.net";
const USER_AGENT = "art-squirrel/0.1";
/* Rate limit in requests/second */
const RATE_LIMIT = 2.0;
/* Maximum variance in rate limit */
const RATE_LIMIT_JITTER = 0.5;

abstract class FuraffinityFetchable extends Fetchable {
  readonly source: Furaffinity;
  url: string;
  get headers(): request.Headers {
    return this.source.headers;
  }
}

class BaseFetchable extends Fetchable {
  constructor(readonly url: string, readonly headers: request.Headers) {
    super();
  }
}
class FuraffinitySubmission extends FuraffinityFetchable implements Submission {
  constructor(readonly source: Furaffinity, readonly id: string) {
    super();
  }

  get site(): string {
    return Object.getPrototypeOf(this.source).constructor.name;
  }

  get url(): string {
    return `${BASE_URL}/view/${this.id}`;
  }

  private cachedMetadata: SubmissionMetadata;

  private lineToPair(line: string) {
    const line_re = /^(Category|Theme|Species|Gender): /;
    if (line_re.test(line)) {
      let [property, value, ..._] = line.split(": ", 2);
      property = "fa-" + property.toLowerCase();
      return [property, value];
    }
    return undefined;
  }

  private parseStatsContainer(statsContainerText: string) {
    const tags = new Map<string, string>();
    const lines = statsContainerText
      .split("\n")
      .map(x => x.trim())
      .filter(x => x);
    const pairs = lines.map(line => this.lineToPair(line)).filter(x => x);
    pairs.forEach(pair => tags.set(pair[0], pair[1]));

    const keywordsStart = lines.lastIndexOf("Keywords:");

    if (keywordsStart > -1 && keywordsStart + 1 < lines.length) {
      const keywords = lines.slice(keywordsStart + 1);
      tags.set("keywords", JSON.stringify(keywords));
    }

    return tags;
  }

  async metadata(): Promise<SubmissionMetadata> {
    const root = await this.root();
    /* Test to see if we've hit an error and abort. */
    if (root.find("td.cat b:contains(System Message)").length > 0) {
      return Promise.reject("System message error");
    }
    /* Extract all the special case crap */
    const title = root.find("td.cat b:nth-last-child(2)").text();
    const artistLink = root.find("td.cat a:nth-child(2)");
    const artist = {
      name: artistLink.text(),
      url: BASE_URL + artistLink.attr("href")
    };
    const imageHref = root
      .find("div.alt1.actions.aligncenter a:contains(Download)")
      .attr("href");
    const imageUrl = nodeUrl.resolve(this.url, imageHref);
    const dateUploadedText = root
      .find("td.stats-container span.popup_date")
      .attr("title");
    const dateUploaded = moment(
      dateUploadedText,
      "MMM Do, YYYY h:mm A"
    ).toDate();
    /* FA-specific fields */
    const tags = this.parseStatsContainer(
      root.find("td.stats-container").text()
    );

    this.cachedMetadata = { title, imageUrl, dateUploaded, artist, tags };
    return this.cachedMetadata;
  }
  async root() {
    const content = await this.content();
    return cheerio.load(content.toString()).root();
  }

  async image(): Promise<Fetchable> {
    return new BaseFetchable(
      (await this.metadata()).imageUrl,
      this.source.headers
    );
  }

  toString(): string {
    return JSON.stringify({
      id: this.id,
      site: this.site,
      metadata: this.cachedMetadata
    });
  }
}

class FuraffinityFavoritesPage extends FuraffinityFetchable {
  constructor(readonly source: Furaffinity, readonly pageNumber: number) {
    super();
  }

  get url() {
    return `${BASE_URL}/favorites/${this.source.targetUser}/${this.pageNumber}`;
  }

  async root() {
    const content = await this.content();
    return cheerio.load(content.toString()).root();
  }

  async isLastPage(): Promise<boolean> {
    return (await this.root()).find(".button-link.right.inactive").length == 0;
  }

  async *submissions() {
    let figures = (await this.root()).find("figure").toArray();
    for (const figure of figures) {
      const id = figure.attribs["id"].split("-")[1];
      yield new FuraffinitySubmission(this.source, id);
    }
  }
}

@register(SITE)
export class Furaffinity implements Site {
  constructor(readonly config: FuraffinityConfig) {}

  private async *favoritePages(): AsyncIterableIterator<
    FuraffinityFavoritesPage
  > {
    let pageNumber = 1;
    let page: FuraffinityFavoritesPage = null;
    do {
      page = new FuraffinityFavoritesPage(this, pageNumber++);
      yield page;
    } while (await page.isLastPage());
  }

  async *favorites() {
    for await (const page of this.favoritePages()) {
      yield* page.submissions();
    }
  }

  get headers(): request.Headers {
    return { "User-Agent": USER_AGENT };
  }

  get targetUser(): string {
    return this.config.targetUser || this.config.username;
  }
}
