import { txt } from "../../src/filetypes/txt";
import * as fs from "fs-extra";
import * as crypto from "crypto";

const TEST_FILE_NAME = "test_data/test.txt";

describe("Text submission deserializer", () => {
  it("should extract submission identifier information", async () => {
    const submission = await txt.deserializer(fs.readFile(TEST_FILE_NAME));
    expect(submission.id).toBe("1234");
    expect(submission.site).toBe("example.com");
  });

  it("should extract document content", async () => {
    const submission = await txt.deserializer(fs.readFile(TEST_FILE_NAME));
    const document = await submission.image();
    const content = await document.content();
    expect(content.toString()).toMatch(/^Lorem ipsum/m);
    expect(content.toString()).toMatch(/asperiores repellat.$/m);
  });

  it("should extract the title, author, and upload date", async () => {
    const submission = await txt.deserializer(fs.readFile(TEST_FILE_NAME));
    const metadata = await submission.metadata();
    expect(metadata.title).toBe("Lorem Ipsum, a love story");
    expect(metadata.artist.name).toBe("Alice");
    expect(metadata.artist.url).toBe("http://www.example.com/~alice/");
    expect(metadata.dateUploaded.getTime()).toBe(
      new Date("Wed May 16 2018 00:33:50 GMT-0400 (EDT)").getTime()
    );
  });

  it("should extract the source URL", async () => {
    const submission = await txt.deserializer(fs.readFile(TEST_FILE_NAME));
    const metadata = await submission.metadata();
    expect(metadata.imageUrl).toBe("http://www.example.com/~alice/1234.txt");
  });

  it("should extract tags and keywords", async () => {
    const submission = await txt.deserializer(fs.readFile(TEST_FILE_NAME));
    const metadata = await submission.metadata();
    expect(metadata.tags.get("gender")).toBe("N/A");
    expect(metadata.tags.get("rating")).toBe("General Audience");
    expect(metadata.tags.get("keywords")).toBe(
      JSON.stringify(["sample", "fake", "latin"])
    );
  });
});

describe("Text submission serializer", () => {
  it("should roundtrip the document verbatim", async () => {
    const input = fs.readFile(TEST_FILE_NAME);
    const inputHash = crypto.createHash("sha256");
    inputHash.update(await input);

    const submission = await txt.deserializer(input);

    const output = txt.serializer(submission);
    const outputHash = crypto.createHash("sha256");
    outputHash.update(await output);

    expect(outputHash.digest("base64")).toBe(inputHash.digest("base64"));
  });
});
