import {ArgumentParser} from 'argparse';
import fileType from 'file-type';
import fsExtra from 'fs-extra';
import fetch, {RequestInit} from 'node-fetch';
import path from 'path';
import process from 'process';
import url from 'url';

import {getFavoritesIds, getSubmissionPage, SubmissionPage} from './furaffinity/index';

const parser = new ArgumentParser();

parser.addArgument(['-c', '--cookies'], {
  help:
      'Path to a JSON file containing the "a" and "b" auth cookies from Furaffinity.',
  required: true,
  type: String
});

parser.addArgument(['-d', '--destination'], {
  help: 'Path to a folder in which to store submissions',
  defaultValue: '.',
  type: String
});

parser.addArgument(['-u', '--user'], {
  help: 'Furaffinity user to fetch favorites from.',
  required: true,
  type: String,
});

parser.addArgument(['-f', '--force'], {
  help:
      'Continue fetching submissions even after encountering an already fetched one ',
  action: 'storeTrue'
});

parser.addArgument(['-F', '--forceAll'], {
  help: 'Fetch all submissions, even those we have already downloaded.',
  action: 'storeTrue'
});

parser.addArgument(
    ['-v', '--verbose'],
    {help: 'Output the number of submissions fetched.', action: 'storeTrue'});

parser.addArgument(
    ['-V', '--veryVerbose'],
    {help: 'Output the IDs of each submission fetched.', action: 'storeTrue'});

parser.addArgument(
    ['--delay'],
    {help: 'Delay between requests, in milliseconds.', defaultValue: 1000});

const options = parser.parseArgs();

const cookies: {a: string; b: string} =
    JSON.parse(fsExtra.readFileSync(options.cookies).toString());

function delay() {
  return new Promise<void>(resolve => setTimeout(resolve, options.delay));
}

function basename(s: string) {
  const index = s.lastIndexOf('.');
  return index == -1 ? s : s.substr(0, index);
}

async function checkForId(submissionId: string|number): Promise<boolean> {
  const filenames = await fsExtra.readdir(options.destination);
  const matchingFilenames = filenames.filter(filename => {
    const base = basename(filename);
    return (
        base == submissionId.toString() ||
        base == submissionId.toString() + '.data');
  });
  return matchingFilenames.length >= 2;
}

let shouldBreak = false;

function registerSignalHandler(signal: any) {
  process.on(signal, function() {
    if (options.verbose) {
      console.error(`${signal} received, finishing up current fetch.`);
    }
    shouldBreak = true;
  });
}

registerSignalHandler('SIGINT');
registerSignalHandler('SIGTERM');

async function main() {
  let submissionsFetched = 0;
  let submissionsSkipped = 0;

  const requestOptions:
      RequestInit = {headers: {'Cookie': `a=${cookies.a};b=${cookies.b};s=1`}};

  for await (
      const submissionId of getFavoritesIds(options.user, requestOptions)) {
    if (shouldBreak) break;
    if (!options.forceAll && (await checkForId(submissionId))) {
      if (options.force) {
        submissionsSkipped++;
        continue;
      } else {
        break;
      }
    }

    await delay();
    const submission: SubmissionPage =
        await getSubmissionPage(submissionId, requestOptions);

    const jsonOutputPath =
        path.join(options.destination, `${submissionId}.data.json`);

    if (!submission.downloadUrl) {
      console.log(`Submission ${submissionId} has no download URL.`);
      submissionsSkipped++;
      continue;
    }
    const fixedDownloadUrl = encodeURI(
        url.resolve('https://www.furaffinity.com', submission.downloadUrl));
    const writeImageToDiskPromise =
        fetch(encodeURI(fixedDownloadUrl), requestOptions)
            .then(response => response.buffer())
            .then((data: Buffer) => {
              const sourceExtension = path.extname(submission.downloadUrl);
              let extension: string;
              const fileTypeGuess = fileType(data);
              if (!fileTypeGuess) {
                extension = sourceExtension || '';
                if (options.veryVerbose) {
                  console.info(`Could not guess fileType for submission ${
                      submissionId}, with URL ${
                      path.basename(submission.downloadUrl)}`);
                }
              } else {
                extension = '.' + fileTypeGuess.ext;
              }
              const downloadOutputPath =
                  path.join(options.destination, `${submissionId}${extension}`);
              fsExtra.writeFile(downloadOutputPath, data)
            });


    const writeJsonToDiskPromise =
        fsExtra.writeFile(jsonOutputPath, JSON.stringify(submission));

    await Promise
        .all([delay(), writeImageToDiskPromise, writeJsonToDiskPromise])
        .then(unusedVoids => {
          submissionsFetched++;
          if (options.veryVerbose) {
            console.info(`Fetched submission ${submissionId} (uploaded on ${
                submission.posted})`);
          }
        });
  }

  if (options.verbose) {
    console.info(`Submissions fetched: ${submissionsFetched}`);
    console.info(`Submissions skipped: ${submissionsSkipped}`);
  }
  return;
}
const p = main();
