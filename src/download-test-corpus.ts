import path from 'path';
import {writeFile} from 'node:fs/promises';
import {USER_AGENT} from './user-agent';

const OUTPUT_DIRECTORY = 'test_data';
const CORPUS = {
  'submission-image': 'https://www.furaffinity.net/view/31552127/',
  'submission-flash': 'https://www.furaffinity.net/view/31526653/',
  'submission-txt': 'https://www.furaffinity.net/view/31547809/',
  'submission-pdf': 'https://www.furaffinity.net/view/31539945/',
  'submission-rtf': 'https://www.furaffinity.net/view/31505793/',
  'favorites-list':
      'https://www.furaffinity.net/favorites/digitalfox/616571786/next'
};

const downloadCorpusEntry = ([outputName, url]: [string, string]) => {
  const outputFile = path.join(OUTPUT_DIRECTORY, outputName + '.html');
  return fetch(url, {headers: {'User-Agent': USER_AGENT}})
      .then((res: Response) => res.arrayBuffer())
      .then((arrayBuffer: ArrayBuffer) =>
                writeFile(outputFile, Buffer.from(arrayBuffer)));
};

Promise.all(Object.entries(CORPUS).map(downloadCorpusEntry));