import { jpeg } from "../../src/filetypes/jpeg";
import {
  makeStaticSubmission,
  Submission,
  SubmissionMetadata,
  SubmissionIdentifier
} from "../../src/core/submission";
import { objectToMap, mapToObject } from "../../src/util/map";
import * as fs from "fs-extra";
import * as crypto from "crypto";

const TEST_SUBMISSION_INFO_NAME = "test_data/test-submission.json";
const TEST_FILE_NAME = "test_data/test.jpg";
const TEST_FILE_OUTPUT_NAME = "test_data/test-out.jpg";

async function makeTestSubmissionInfo(): Promise<Submission> {
  const submissionInfoBuffer = await fs.readFile(TEST_SUBMISSION_INFO_NAME);
  const submissionInfo = JSON.parse(submissionInfoBuffer.toString());

  const identifier = submissionInfo.identifier;

  const metadata = submissionInfo.metadata;
  metadata.tags = objectToMap(metadata.tags);

  const submissionFileBuffer = await fs.readFile(TEST_FILE_NAME);
  return makeStaticSubmission(identifier, metadata, submissionFileBuffer);
}

describe("JPEG submission serializer", () => {
  it("should create a valid JPEG", async () => {
    const submission = await makeTestSubmissionInfo();
    const data = await jpeg.serializer(submission);
    await fs.writeFile(TEST_FILE_OUTPUT_NAME, data);
  });

  xit("should extract image content, sans custom tags.", async () => {
    const submission = await jpeg.deserializer(fs.readFile(TEST_FILE_NAME));
    const document = await submission.image();
    const content = await document.content();
    expect(content.toString()).toMatch(/^Lorem ipsum/m);
    expect(content.toString()).toMatch(/asperiores repellat.$/m);
  });

  xit("should extract the title, author, and upload date", async () => {
    const submission = await jpeg.deserializer(fs.readFile(TEST_FILE_NAME));
    const metadata = await submission.metadata();
    expect(metadata.title).toBe("Engine Bay");
    expect(metadata.artist.name).toBe("Philip Kovac");
    expect(metadata.artist.url).toBe("http://www.example.com/~pkovac/");
    expect(metadata.dateUploaded.getTime()).toBe(
      new Date("Wed May 16 2018 00:33:50 GMT-0400 (EDT)").getTime()
    );
  });

  xit("should extract the source URL", async () => {
    const submission = await jpeg.deserializer(fs.readFile(TEST_FILE_NAME));
    const metadata = await submission.metadata();
    expect(metadata.imageUrl).toBe("http://www.example.com/~pkovac/1234.jpeg");
  });

  xit("should extract tags and keywords", async () => {
    const submission = await jpeg.deserializer(fs.readFile(TEST_FILE_NAME));
    const metadata = await submission.metadata();
    expect(metadata.tags.get("gender")).toBe("N/A");
    expect(metadata.tags.get("rating")).toBe("General Audience");
    expect(metadata.tags.get("keywords")).toBe(
      JSON.stringify(["sample", "jeep", "engine"])
    );
  });
});

describe("JPEG submission deserializer", () => {
  xit("should roundtrip the document verbatim", async () => {
    const input = fs.readFile(TEST_FILE_NAME);
    const inputHash = crypto.createHash("sha256");
    inputHash.update(await input);

    const submission = await jpeg.deserializer(input);

    const output = jpeg.serializer(submission);
    const outputHash = crypto.createHash("sha256");
    outputHash.update(await output);

    expect(outputHash.digest("base64")).toBe(inputHash.digest("base64"));
  });
});
