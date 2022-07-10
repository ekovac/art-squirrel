import fileType from 'file-type';
import url from "url";
import path from "path";

import {
  FavoritesPage,
  scrapePage as scrapeFavoritesPage,
} from "./favorites-page";
import {
  scrapePage as scrapeSubmissionPage,
  SubmissionPage,
} from "./submission-page";
export { SubmissionPage } from "./submission-page";
import { ArgumentParser } from "argparse";
import { readdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

export function setupParser(parser: ArgumentParser) {
  parser.addArgument(["-c", "--cookies"], {
    help:
      'Path to a JSON file containing the "a" and "b" auth cookies from Furaffinity.',
    required: true,
    type: String,
  });

  parser.addArgument(["-d", "--destination"], {
    help: "Path to a folder in which to store submissions",
    defaultValue: ".",
    type: String,
  });

  parser.addArgument(["-u", "--user"], {
    help: "Furaffinity user to fetch favorites from.",
    required: true,
    type: String,
  });

  parser.addArgument(["-f", "--force"], {
    help:
      "Continue fetching submissions even after encountering an already fetched one ",
    action: "storeTrue",
  });

  parser.addArgument(["-F", "--forceAll"], {
    help: "Fetch all submissions, even those we have already downloaded.",
    action: "storeTrue",
  });

  parser.addArgument(["-v", "--verbose"], {
    help: "Output the number of submissions fetched.",
    action: "storeTrue",
  });

  parser.addArgument(["-V", "--veryVerbose"], {
    help: "Output the IDs of each submission fetched.",
    action: "storeTrue",
  });

  parser.addArgument(["--delay"], {
    help: "Delay between requests, in milliseconds.",
    defaultValue: 1000,
  });
}

const BASE_URL = "https://www.furaffinity.net/";

async function getFavoritesPage(
  uri: string,
  options: RequestInit,
): Promise<FavoritesPage> {
  const response = await fetch(uri, options);
  const pageContent = await response.text();
  return scrapeFavoritesPage(pageContent);
}

async function getSubmissionPage(
  id: string,
  options: RequestInit,
): Promise<SubmissionPage> {
  const uri = url.resolve(BASE_URL, `/view/${id}/`);
  const response = await fetch(uri, options);
  const pageContent = await response.text();
  const submissionPage = await scrapeSubmissionPage(pageContent);
  submissionPage.sourceUrl = uri;
  return submissionPage;
}

async function* getFavoritesIds(
  username: string,
  options: RequestInit,
): AsyncIterableIterator<string> {
  let pageUrl = `/favorites/${username}`;

  do {
    let fullUrl = url.resolve(BASE_URL, pageUrl);
    const page = await getFavoritesPage(fullUrl, options);
    for (const submissionId of page.submissions) {
      yield submissionId;
    }
    pageUrl = page.nextPageUrl;
  } while (pageUrl);
  return;
}

export const executeFetch = async (options: any) => {
  function delay() {
    return new Promise<void>((resolve) => setTimeout(resolve, options.delay));
  }

  function basename(s: string) {
    const index = s.lastIndexOf(".");
    return index == -1 ? s : s.substr(0, index);
  }

  async function checkForId(submissionId: string | number): Promise<boolean> {
    const filenames = await readdir(options.destination);
    const matchingFilenames = filenames.filter((filename) => {
      const base = basename(filename);
      return (
        base == submissionId.toString() ||
        base == submissionId.toString() + ".data"
      );
    });
    return matchingFilenames.length >= 2;
  }

  let shouldBreak = false;

  function registerSignalHandler(signal: any) {
    process.on(signal, function () {
      if (options.verbose) {
        console.error(`${signal} received, finishing up current fetch.`);
      }
      shouldBreak = true;
    });
  }

  registerSignalHandler("SIGINT");
  registerSignalHandler("SIGTERM");

  async function main() {
    let submissionsFetched = 0;
    let submissionsSkipped = 0;
    let submissionsErrors = 0;

    const cookies: { a: string; b: string } = JSON.parse(
      readFileSync(options.cookies).toString(),
    );

    const requestOptions: RequestInit = {
      headers: { Cookie: `a=${cookies.a};b=${cookies.b};s=1` },
    };

    for await (const submissionId of getFavoritesIds(
      options.user,
      requestOptions,
    )) {
      if (shouldBreak) break;
      if (!options.forceAll && (await checkForId(submissionId))) {
        if (options.force) {
          if (options.veryVerbose) {
            console.log(
              `Skipped submission ${submissionId}; already downloaded.`,
            );
          }
          submissionsSkipped++;
          continue;
        } else {
          break;
        }
      }

      await delay();
      const submission: SubmissionPage = await getSubmissionPage(
        submissionId,
        requestOptions,
      );

      const jsonOutputPath = path.join(
        options.destination,
        `${submissionId}.data.json`,
      );

      if (!submission.downloadUrl) {
        console.error(`Submission ${submissionId} has no download URL.`);
        submissionsErrors++;
        continue;
      }
      const fixedDownloadUrl = url.resolve(
        "https://www.furaffinity.com",
        submission.downloadUrl,
      );
      const writeImageToDiskPromise = fetch(
        encodeURI(fixedDownloadUrl),
        requestOptions,
      )
        .then((response) => {
          if (response.status !== 200) {
            throw Error(
              `Failed to download submission ${submissionId}: HTTP ${response.status}`,
            );
          }
          return response.arrayBuffer();
        })
        .then(
          (arrayBuffer: ArrayBuffer) => {
            const data = Buffer.from(arrayBuffer);
            const sourceExtension = path.extname(submission.downloadUrl);
            let extension: string;
            const fileTypeGuess = fileType(data);
            if (!fileTypeGuess) {
              extension = sourceExtension || "";
              if (options.veryVerbose) {
                console.info(
                  `Could not guess fileType for submission ${submissionId}, with URL ${path.basename(
                    submission.downloadUrl,
                  )}`,
                );
              }
            } else {
              extension = "." + fileTypeGuess.ext;
            }
            const downloadOutputPath = path.join(
              options.destination,
              `${submissionId}${extension}`,
            );
            writeFile(downloadOutputPath, data);
          },
          (reason) => {
            console.error(reason);
          },
        );

      const writeJsonToDiskPromise = writeFile(
        jsonOutputPath,
        JSON.stringify(submission),
      );

      await Promise.all([
        delay(),
        writeImageToDiskPromise,
        writeJsonToDiskPromise,
      ]).then((unusedVoids) => {
        submissionsFetched++;
        if (options.veryVerbose) {
          console.info(
            `Fetched submission ${submissionId} (uploaded on ${submission.posted})`,
          );
        }
      });
    }

    if (options.verbose) {
      console.info(`Submissions fetched: ${submissionsFetched}`);
      console.info(`Submissions skipped: ${submissionsSkipped}`);
      console.info(`Submissions with errors: ${submissionsErrors}`);
    }
    return;
  }
  const p = main();
};

export const module = {
  name: 'furaffinity',
  setupParser,
  executeFetch
};