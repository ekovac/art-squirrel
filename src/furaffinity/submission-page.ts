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
  title: '.classic-submission-title.information h2',
  artist: '.classic-submission-title.information a',
  description: {selector: 'td[width="70%"]', how: 'html'},
  posted: {
    selector: '#page-submission td.stats-container span.popup_date',
    attr: 'title'
  },
  folders: {listItem: '.folder-list-container a'},
  keywords: {listItem: '#keywords > a'},
  rating: {selector: 'td.stats-container img', attr: 'alt'},
  downloadUrl: {selector: 'a:contains("Download")', attr: 'href'}
};

export function scrapePage(content: string) {
  const doc = cheerio.load(content);
  const page = scrape.scrapeHTML<SubmissionPage>(doc, scrapeDefinition);
  page.site = 'furaffinity';
  return page;
}