import { FurAffinityClient, Submission } from "fa.js";
import { ArgumentParser } from "argparse";
import requestPromise from "request-promise-native";
import fsExtra from "fs-extra";
import path from "path";
import process from "process";

const parser = new ArgumentParser();

parser.addArgument(["-c", "--cookies"], {
  help:
    'Path to a JSON file containing the "a" and "b" auth cookies from Furaffinity.',
  required: true,
  type: String
});

parser.addArgument(["-d", "--destination"], {
  help: "Path to a folder in which to store submissions",
  defaultValue: ".",
  type: String
});

parser.addArgument(["-f", "--force"], {
  help:
    "Continue fetching submissions even after encountering an already fetched one ",
  action: "storeTrue"
});

parser.addArgument(["-F", "--forceAll"], {
  help: "Fetch all submissions, even those we have already downloaded.",
  action: "storeTrue"
});

parser.addArgument(["-v", "--verbose"], {
  help: "Output the number of submissions fetched.",
  action: "storeTrue"
});

parser.addArgument(["-V", "--veryVerbose"], {
  help: "Output the IDs of each submission fetched.",
  action: "storeTrue"
});

parser.addArgument(["--delay"], {
  help: "Delay between requests, in milliseconds.",
  defaultValue: 1000
});

const options = parser.parseArgs();

const cookies: { a: string; b: string } = JSON.parse(
  fsExtra.readFileSync(options.cookies).toString()
);

const faClient = new FurAffinityClient(`a=${cookies.a};b=${cookies.b};s=1`);

function delay() {
  return new Promise<void>(resolve => setTimeout(resolve, options.delay));
}

function basename(s: string) {
  const index = s.lastIndexOf(".");
  return index == -1 ? s : s.substr(0, index);
}

async function checkForId(submissionId: string | number): Promise<boolean> {
  const filenames = await fsExtra.readdir(options.destination);
  const matchingFilenames = filenames.filter(filename => {
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
  process.on(signal, function() {
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

  for await (const submissionListing of faClient.getFavorites("digitalfox")) {
    if (shouldBreak) break;
    if (!options.forceAll && (await checkForId(submissionListing.id))) {
      if (options.force) {
        submissionsSkipped++;
        continue;
      } else {
        break;
      }
    }

    await delay();
    const submission: Submission & {
      page_url?: string;
    } = await faClient.getSubmission(submissionListing.id);
    const extension = path.extname(submission.url);
    const imageOutputPath = path.join(
      options.destination,
      `${submissionListing.id}${extension}`
    );
    const jsonOutputPath = path.join(
      options.destination,
      `${submissionListing.id}.data.json`
    );

    const writeImageToDiskPromise = requestPromise
      .get({
        uri: submission.url,
        encoding: null
      })
      .then((data: Buffer) => fsExtra.writeFile(imageOutputPath, data));

    submission.page_url = submissionListing.url;
    delete submission.comments;
    delete submission.body_text;

    const writeJsonToDiskPromise = fsExtra.writeFile(
      jsonOutputPath,
      JSON.stringify(submission)
    );

    await Promise.all([
      delay(),
      writeImageToDiskPromise,
      writeJsonToDiskPromise
    ]).then(unusedVoids => {
      submissionsFetched++;
      if (options.veryVerbose) {
        console.log(
          `Fetched submission ${submissionListing.id} (uploaded on ${
            submission.upload_date
          })`
        );
      }
    });
  }

  if (options.verbose) {
    console.log(`Submissions fetched: ${submissionsFetched}`);
    console.log(`Submissions skipped: ${submissionsSkipped}`);
  }
  return;
}
const p = main();
