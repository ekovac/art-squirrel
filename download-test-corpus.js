const fs = require('fs-extra');
const fetch = require('node-fetch');
const path = require('path');

const OUTPUT_DIRECTORY = 'test_data';
const CORPUS = {
  'submission-image': 'http://www.furaffinity.net/view/31552127/',
  'submission-flash': 'http://www.furaffinity.net/view/31526653/',
  'submission-txt': 'http://www.furaffinity.net/view/31547809/',
  'submission-pdf': 'http://www.furaffinity.net/view/31539945/',
  'submission-rtf': 'http://www.furaffinity.net/view/31505793/',
  'favorites-list':
      'http://www.furaffinity.net/favorites/digitalfox/616571786/next'
};

const downloadCorpusEntry = ([outputName, url]) => {
  const outputFile = path.join(OUTPUT_DIRECTORY, outputName + '.html');
  return fetch(url).then(
      res => fs.promises.writeFile(outputFile, res.buffer()));
};

Promise.all(Object.entries(CORPUS).map(downloadCorpusEntry));