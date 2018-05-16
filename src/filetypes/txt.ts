import {
  FiletypeHandler,
  makeStaticSubmission,
  mapToObject,
  objectToMap,
  Submission,
  SubmissionMetadata,
  SubmissionIdentifier
} from "../common";
import * as yaml from "js-yaml";

interface YamlPrefix {
  Title: string;
  Author: {
    Name: string;
    URL: string;
  };
  Date: string;
}

interface YamlSuffix {
  Source: string;
  Site: string;
  ID: string;
  Tags: { [key: string]: string };
}

export const txt: FiletypeHandler = {
  mimeTypes: ["text/plain"],
  async serializer(submission: Submission): Promise<Buffer> {
    const content = await (await submission.image()).content();
    const metadata = await submission.metadata();
    const identifier: SubmissionIdentifier = {
      id: submission.id,
      site: submission.site
    };

    const prefix: YamlPrefix = {
      Title: metadata.title,
      Author: {
        Name: metadata.artist.name,
        URL: metadata.artist.url
      },
      Date: metadata.dateUploaded.toString()
    };
    const suffix: YamlSuffix = {
      Source: metadata.imageUrl,
      Site: submission.site,
      ID: submission.id,
      Tags: mapToObject(metadata.tags)
    };

    const prefixText = yaml.safeDump(prefix);
    const suffixText = yaml.safeDump(suffix);
    /* Per http://yaml.org/spec/1.0/#ns-ns-document-start */
    const newContent = [prefixText, content.toString(), suffixText].join(
      "---\n"
    );

    return new Buffer(newContent, "utf-8");
  },
  async deserializer(buffer: Promise<Buffer>): Promise<Submission> {
    const document = (await buffer).toString();
    /* Per http://yaml.org/spec/1.0/#ns-ns-document-start */
    const components = document.split("---\n");
    if (components.length != 3) {
      return Promise.reject(new Error("Malformed ArtSquirrel text submission"));
    }

    const prefixText = components[0];
    const contentText = components[1];
    const suffixText = components[2];

    const prefix = yaml.safeLoad(prefixText) as YamlPrefix;
    const suffix = yaml.safeLoad(suffixText) as YamlSuffix;

    const metadata: SubmissionMetadata = {
      title: prefix.Title,
      artist: { name: prefix.Author.Name, url: prefix.Author.URL },
      dateUploaded: new Date(prefix.Date),
      imageUrl: suffix.Source,
      tags: objectToMap(suffix.Tags)
    };

    const identifier: SubmissionIdentifier = {
      id: suffix.ID,
      site: suffix.Site
    };

    return makeStaticSubmission(identifier, metadata, new Buffer(contentText));
  }
};
