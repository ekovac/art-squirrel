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
    'attr': 'id',
    convert: (sid: string) => {
      return sid.split('-')[1];
    }
  },
  'nextPage': {selector: 'a.button-link.right', attr: 'href'},
  'previousPage': {selector: 'a.button-link.right', attr: 'href'},
}

export function scrapeFavoritesPage(content: string) {
  const doc = cheerio.load(content);
  const page = scrape.scrapeHTML<FavoritesPage>(doc, scrapeDefinition);
  return page;
}