import {
  Site,
  SiteConfig,
  SubmissionMetadata,
  Submission,
  Fetchable,
  BasicFetchable
} from "../common";
import { SITE } from "../plugin_registry";
import * as cheerio from "cheerio";
import * as request from "request";
import * as moment from "moment";
import * as requestPromise from "request-promise-native";
import * as nodeUrl from "url";
import { Schema } from "jsonschema";

export interface FuraffinityConfig extends SiteConfig {
  // A valid set of login cookies needed for accessing adult artwork or artwork
  // restricted to members only. If not specified, defaults to 'cookies.txt'
  cookieLocation?: string;
}
// And a config schema for it.
const CONFIG_SCHEMA: Schema = {
  id: "FuraffinityConfig",
  type: "object",
  properties: {
    target: { type: "array", items: { type: "string" } },
    query: { type: "array", items: { type: "string" } },
    cookieLocation: { type: "string" }
  }
};

const BASE_URL = "https://furaffinity.net";
const USER_AGENT = "art-squirrel/0.1";
// Rate limit in requests/second
const RATE_LIMIT = 2.0;
// Maximum variance in rate limit
const RATE_LIMIT_JITTER = 0.5;

abstract class FuraffinityFetchable extends Fetchable {
  readonly source: Furaffinity;
  url: string;
  get headers(): request.Headers {
    return this.source.headers;
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
    return new BasicFetchable(
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

class FavoritesPage extends FuraffinityFetchable {
  constructor(
    readonly source: Furaffinity,
    readonly username: string,
    readonly pageNumber: number
  ) {
    super();
  }

  get url() {
    return `${BASE_URL}/favorites/${this.username}/${this.pageNumber}`;
  }

  async root() {
    const content = await this.content();
    return cheerio.load(content.toString()).root();
  }

  async isLastPage(): Promise<boolean> {
    return (await this.root()).find(".button-link.right.inactive").length != 0;
  }

  async *submissions() {
    let figures = (await this.root()).find("figure").toArray();
    for (const figure of figures) {
      const id = figure.attribs["id"].split("-")[1];
      yield new FuraffinitySubmission(this.source, id);
    }
  }
}

@SITE(CONFIG_SCHEMA)
export class Furaffinity implements Site {
  constructor(readonly config: FuraffinityConfig, readonly path: string) {}
  private async *favoritePages(
    username: string
  ): AsyncIterableIterator<FavoritesPage> {
    let pageNumber = 1;
    let page: FavoritesPage = null;
    do {
      page = new FavoritesPage(this, username, pageNumber++);
      yield page;
    } while (!await page.isLastPage());
  }

  async *submissions(): AsyncIterableIterator<Submission> {
    for (const query of this.config.query) {
      if (query.lastIndexOf(":") != -1) {
        let [specialQueryType, parameter] = query.split(":", 2);
        specialQueryType = specialQueryType.toLowerCase();
        switch (specialQueryType) {
          case "favorites":
            yield* this.favorites(parameter);
        }
      }
    }
  }

  private async *favorites(
    username: string
  ): AsyncIterableIterator<Submission> {
    for await (const page of this.favoritePages(username)) {
      yield* page.submissions();
    }
  }

  get headers(): request.Headers {
    return { "User-Agent": USER_AGENT };
  }
}
