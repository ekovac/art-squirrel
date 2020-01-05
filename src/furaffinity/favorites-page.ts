import * as cheerio from 'cheerio';
import * as scrape from 'scrape-it';


export interface FavoritesPage {
  submissions: string[];
  nextPageUrl: string;
  previousPageUrl: string;
}

const scrapeDefinition = {
  'submissions': {
    'listItem': 'figure',
    'data': {
      id: {
        attr: 'id',
        convert: (sid: string) => {
          return sid.split('-')[1];
        }
      }
    }
  },
  'previousPageUrl': { selector: 'a.mobile-button.left', attr: 'href' },
  'nextPageUrl': { selector: 'a.mobile-button.right', attr: 'href' },
};

export function scrapePage(content: string) {
  const doc = cheerio.load(content);
  const page = scrape.scrapeHTML<FavoritesPage>(doc, scrapeDefinition);
  page.submissions = page.submissions.map((item: any) => item.id);
  return page;
}