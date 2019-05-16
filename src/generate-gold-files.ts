import {scrapePage as scrapeFavorites} from './furaffinity/favorites-page';
import {scrapePage as scrapeSubmission} from './furaffinity/submission-page';
const fs = require('fs-extra');
const path = require('path');

const OUTPUT_DIRECTORY = 'test_data';
const fileNames = [
  'submission-image',
  'submission-flash',
  'submission-txt',
  'submission-pdf',
  'submission-rtf',
  'favorites-list',
];


const generateGoldFile = (fileName: string) => {
  const [prefix, suffix] = fileName.split('-');

  let scraper: (_: string) => {
    [key: string]: any
  };
  switch (prefix) {
    case 'submission':
      scraper = scrapeSubmission;
      break;
    case 'favorites':
      scraper = scrapeFavorites;
      break;
    default:
      scraper = scrapeSubmission;
  }
  const filePath = path.join(OUTPUT_DIRECTORY, fileName + '.html');
  const jsonPath = path.join(OUTPUT_DIRECTORY, fileName + '.json');
  if (scraper) {
    return fs.promises.readFile(filePath, {encoding: 'utf-8'})
        .then(scraper)
        .then((output: {[key: string]: any}) => JSON.stringify(output, null, 2))
        .then(
            (outputString: string) =>
                fs.promises.writeFile(jsonPath, outputString));
  } else {
    return undefined;
  }
};


Promise.all(fileNames.map(generateGoldFile).filter(x => Boolean(x)));