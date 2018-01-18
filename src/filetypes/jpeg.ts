import {
  FiletypeHandler,
  makeStaticSubmission,
  mapToObject,
  objectToMap,
  Submission,
  SubmissionIdentifier
} from "../common";
import * as piexif from "piexifjs";

export const handler: FiletypeHandler = {
  mimeTypes: ["image/jpeg"],
  async serializer(submission: Submission): Promise<Buffer> {
    const content = await (await submission.image()).content();
    const metadata = await submission.metadata();
    const jpegData = content.toString("binary");
    const exifObj = piexif.load(jpegData);
    const exif = exifObj["Exif"];
    const zeroth = exifObj["0th"];
    const identifier = {
      id: submission.id,
      site: submission.site
    };
    exif[piexif.ExifIFD.ImageUniqueID] = JSON.stringify(identifier);

    zeroth[piexif.ImageIFD.ImageID] = metadata.imageUrl;
    zeroth[piexif.ImageIFD.ImageDescription] = metadata.title;
    zeroth[piexif.ImageIFD.Artist] = metadata.artist.name;
    exif[piexif.ExifIFD.DateTimeDigitized] = metadata.dateUploaded;

    zeroth[piexif.ImageIFD.SecurityClassification] = JSON.stringify(
      mapToObject(metadata.tags)
    );

    const exifBytes = piexif.dump(exifObj);

    const newJpegData = piexif.insert(exifBytes, jpegData);
    /* Preserve the original EXIF data. */
    return new Buffer(newJpegData, "binary");
  },

  async deserializer(buffer: Promise<Buffer>): Promise<Submission> {
    const content = await buffer;
    const jpegData = content.toString("binary");
    const exifObj = piexif.load(jpegData)["Exif"];
    const exif = exifObj["Exif"];
    const zeroth = exifObj["0th"];

    const identifier = JSON.parse(
      exif[piexif.ExifIFD.ImageUniqueID]
    ) as SubmissionIdentifier;

    const imageUrl = zeroth[piexif.ImageIFD.ImageID];
    const title = zeroth[piexif.ImageIFD.ImageDescription];
    const artist = {
      name: zeroth[piexif.ImageIFD.Artist]
    };
    const dateUploaded = exif[piexif.ExifIFD.DateTimeDigitized];

    const tags = objectToMap(
      JSON.parse(zeroth[piexif.ImageIFD.SecurityClassification])
    );

    const metadata = {
      imageUrl,
      title,
      artist,
      dateUploaded,
      tags
    };
    return makeStaticSubmission(identifier, metadata, content);
  }
};
