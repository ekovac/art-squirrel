import 'jasmine';

import fs from 'fs';
import path from 'path';

import {scrapePage as scrapeFavorites} from '../furaffinity/favorites-page';
import {scrapePage as scrapeSubmission} from '../furaffinity/submission-page';

const DATA_FOLDER = 'test_data';

type ScraperFunction = (content: string) => {
  [key: string]: any
};

const SCRAPERS: {[key: string]: ScraperFunction|undefined} = {
  favorites: scrapeFavorites,
  submission: scrapeSubmission,
};

const buildTest = (scraper: ScraperFunction, goldFileName: string): void => {
  const goldFilePath = path.join(DATA_FOLDER, goldFileName);
  const [goldFileBaseName, ext] = goldFileName.split('.');
  const [unused, subType] = goldFileBaseName.split('-');
  const testFilePath = path.join(DATA_FOLDER, goldFileBaseName + '.html');
  const goldObject =
      JSON.parse(fs.readFileSync(goldFilePath, {encoding: 'utf-8'}));
  const testContent = fs.readFileSync(testFilePath, {encoding: 'utf-8'});
  if (scraper) {
    const testObject = scraper(testContent);
    describe(`parsing ${subType} pages`, () => {
      for (const key of Object.keys(goldObject)) {
        it(`should extract ${key}`, () => {
          expect(testObject[key]).toEqual(goldObject[key]);
        });
      }
    });
  }
};


const goldFiles =
    fs.readdirSync(DATA_FOLDER).filter(name => name.endsWith('.json')).sort();

describe('Submission scraper', () => {
  const submissionGoldFiles =
      goldFiles.filter(name => name.startsWith('submission'));
  for (const goldFile of submissionGoldFiles) {
    buildTest(scrapeSubmission, goldFile);
  }
});

describe('Favorites scraper', () => {
  const favoritesGoldFiles =
      goldFiles.filter(name => name.startsWith('favorites'));
  for (const goldFile of favoritesGoldFiles) {
    buildTest(scrapeFavorites, goldFile)
  }
});
