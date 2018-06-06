import { Submission } from "./submission";

export interface SiteEntry {
  id?: string;
  type: string;
  config: SiteConfig;
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
