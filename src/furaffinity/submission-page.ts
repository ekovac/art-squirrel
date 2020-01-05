import * as cheerio from 'cheerio';
import * as scrape from 'scrape-it';

export interface SubmissionPage {
  site: 'furaffinity';
  title: string;
  artist: string;
  description: string;
  posted: string;
  category?: string;
  theme?: string;
  species?: string;
  gender?: string;
  folders: string[];
  keywords: string[];
  downloadUrl: string;
  sourceUrl: string;
  rating: string;
}

function extractDescription(element: CheerioSelector) {
  const html = (element as any as Cheerio).html() || '';
  // The artist icon/portrait are separated from the description by two
  // linebreaks and a newline.
  return html.split('<br><br>\n')[1];
}

const scrapeDefinition = {
  title: '.submission-title h2',
  artist: '.submission-id-sub-container a strong',
  description: { selector: '.submission-description', how: 'html' },
  posted: {
    selector: '.submission-id-sub-container span.popup_date',
    attr: 'title'
  },
  folders: { listItem: '.folder-list-container a' },
  keywords: { listItem: 'section.tags-mobile .tags' },
  rating: { selector: '.submission-content .rating .rating-box.inline' },
  downloadUrl: { selector: 'a:contains("Download")', attr: 'href' }
};

export function scrapePage(content: string) {
  const doc = cheerio.load(content);
  const page = scrape.scrapeHTML<SubmissionPage>(doc, scrapeDefinition);
  page.site = 'furaffinity';
  return page;
}