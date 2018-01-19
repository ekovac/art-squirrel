import {
  FiletypeHandler,
  makeStaticSubmission,
  mapToObject,
  objectToMap,
  Submission,
  SubmissionIdentifier
} from "../common";

import { PngImage } from "./png_helper";

export const png: FiletypeHandler = {
  mimeTypes: ["image/png"],
  async serializer(submission: Submission): Promise<Buffer> {
    const content = await (await submission.image()).content();
    const metadata = await submission.metadata();
    const pngImage = new PngImage(content);
    const tags = pngImage.getTextTags();

    const identifier: SubmissionIdentifier = {
      id: submission.id,
      site: submission.site
    };

    tags.set("ImageUniqueID", JSON.stringify(identifier));
    tags.set("Title", metadata.title);
    tags.set("Author", metadata.artist.name);
    tags.set("Author URL", metadata.artist.url);
    tags.set("DateUploaded", metadata.dateUploaded.toString());
    tags.set("Source URL", metadata.imageUrl);
    tags.set("Tags", JSON.stringify(mapToObject(metadata.tags)));

    pngImage.setTextTags(tags);

    return pngImage.buffer;
  },
  async deserializer(buffer: Promise<Buffer>): Promise<Submission> {
    const content = await buffer;
    const pngImage = new PngImage(content);
    const tags = pngImage.getTextTags();
    const identifier = JSON.parse(tags.get("ImageUniqueID"));
    const title = tags.get("Title");
    const artist = {
      name: tags.get("Author"),
      url: tags.get("Author URL")
    };
    const dateUploaded = new Date(Date.parse(tags.get("DateUploaded")));
    const imageUrl = tags.get("Source URL");
    const metadataTags = objectToMap(JSON.parse(tags.get("Tags")));
    const metadata = {
      title,
      artist,
      dateUploaded,
      imageUrl,
      tags: metadataTags
    };
    return makeStaticSubmission(identifier, metadata, content);
  }
};
