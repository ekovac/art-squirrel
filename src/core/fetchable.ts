import * as requestPromise from "request-promise-native";
import * as request from "request";

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
export class BasicFetchable extends Fetchable {
  constructor(readonly url: string, readonly headers: request.Headers) {
    super();
  }
}

export class StaticFetchable extends Fetchable {
  url = "";
  headers = {};
  constructor(private readonly staticContent: Buffer | null) {
    super();
  }
  content(): Promise<Buffer> {
    if (this.staticContent === null) {
      Promise.reject("No content supplied for this StaticFetchable.");
    } else {
      return Promise.resolve(this.staticContent);
    }
  }
}
