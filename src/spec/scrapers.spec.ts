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

const buildTest = (goldFileName: string): void => {
  const goldFilePath = path.join(DATA_FOLDER, goldFileName);
  const [goldFileBaseName, ext] = goldFileName.split('.');
  const [mainType, subType] = goldFileBaseName.split('-');
  const testFilePath = path.join(DATA_FOLDER, goldFileBaseName + '.html');
  const goldObject =
      JSON.parse(fs.readFileSync(goldFilePath, {encoding: 'utf-8'}));
  const testContent = fs.readFileSync(testFilePath, {encoding: 'utf-8'});
  const scraper = SCRAPERS[mainType];
  if (scraper) {
    const testObject = scraper(testContent);
    describe(`${mainType} scraper`, () => {
      describe(`parsing ${subType} pages`, () => {
        for (const key of Object.keys(goldObject)) {
          it(`should extract ${key}`, () => {
            expect(testObject[key]).toEqual(goldObject[key]);
          });
        }
      });
    });
  }
};

fs.readdirSync(DATA_FOLDER)
    .filter(name => name.endsWith('.json'))
    .sort()
    .map(buildTest);