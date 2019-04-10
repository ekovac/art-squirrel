import {FurAffinityClient, Submission} from 'fa.js';
import {ArgumentParser} from 'argparse';
import * as requestPromise from 'request-promise-native';
import * as fsExtra from 'fs-extra';
import * as path from 'path';

const parser = new ArgumentParser();

parser.addArgument(['-c', '--cookies'], {
    help: 'A file in cookies.txt format containing auth cookies from Furaffinity.',
    required: true,
    type: String,
});

parser.addArgument(['-d', '--destination'], {
    help: 'Path to a folder in which to store submissions',
    defaultValue: '.',
    type: String,
});

parser.addArgument(['-f', '--force'], {
    help: 'Continue fetching submissions even after encountering an already fetched one ',
    action: 'storeTrue',
})

parser.addArgument(['--delay'], {
    help: 'Delay between requests, in milliseconds.',
    defaultValue: 1000,
})


const options = parser.parseArgs();

const cookies: {a: string, b: string} = JSON.parse(fsExtra.readFileSync(options.cookies).toString());

const faClient = new FurAffinityClient(`a=${cookies.a};b=${cookies.b};s=1`);

function delay() {
    return new Promise((resolve) => setTimeout(resolve, options.delay)); 
}

async function checkForId(submissionId: string|number): Promise<boolean> {
    return false;
}

async function main() {
    for await (const submissionListing of faClient.getFavorites('digitalfox')) {
        await delay();
        const submission: Submission & {page_url?: string} = await faClient.getSubmission(submissionListing.id);

        const extension = path.extname(submission.url);
        const imageOutputPath = path.join(options.destination, `${submissionListing.id}${extension}`);
        const jsonOutputPath = path.join(options.destination, `${submissionListing.id}.json`);

        const writeImageToDiskPromise = requestPromise.get({
            uri: submission.url,
            encoding: null,
        }).then(
                (data: Buffer) => fsExtra.writeFile(imageOutputPath, data)
        );

        submission.page_url = submissionListing.url;
        submission.comments = null;
        submission.body_text = null;

        const writeJsonToDiskPromise = fsExtra.writeFile(jsonOutputPath, JSON.stringify(submission));
   
        await Promise.all([delay(), writeImageToDiskPromise, writeJsonToDiskPromise]);
    }
    return;
}
const p = main();