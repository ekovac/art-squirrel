import { FileTypeHandler } from "../core/filetypes";
import { FILETYPE } from "../plugin_registry";
import {
  Submission,
  SubmissionIdentifier,
  SubmissionMetadata,
  makeStaticSubmission
} from "../core/submission";
import * as moment from "moment";
import { mapToObject, objectToMap } from "../util/map";
import * as piexif from "piexifjs";

interface ExifObject {
  ["0th"]: { [key: string]: string };
  Exif: { [key: string]: string };
}

/* Exported for testing */
function fromSubmissionInfoToJpegTags(
  identifier: SubmissionIdentifier,
  metadata: SubmissionMetadata,
  exifObj: ExifObject
): void {
  const zeroth = exifObj["0th"];
  const exif = exifObj.Exif;

  exif[piexif.ExifIFD.ImageUniqueID] = JSON.stringify(identifier);

  zeroth[piexif.ImageIFD.ImageID] = metadata.imageUrl;
  zeroth[piexif.ImageIFD.ImageDescription] = metadata.title;
  zeroth[piexif.ImageIFD.Artist] = metadata.artist.name;
  exif[piexif.ExifIFD.DateTimeDigitized] = moment(
    metadata.dateUploaded
  ).toISOString();

  zeroth[piexif.ImageIFD.SecurityClassification] = JSON.stringify(
    mapToObject(metadata.tags)
  );
}

/* Exported for testing */
export function fromJpegTagsToSubmissionInfo(
  exifObj: ExifObject
): { identifier: SubmissionIdentifier; metadata: SubmissionMetadata } {
  const exif = exifObj["Exif"];
  const zeroth = exifObj["0th"];

  const identifier = JSON.parse(
    exif[piexif.ExifIFD.ImageUniqueID]
  ) as SubmissionIdentifier;

  const imageUrl = zeroth[piexif.ImageIFD.ImageID];
  const title = zeroth[piexif.ImageIFD.ImageDescription];
  const artist = { name: zeroth[piexif.ImageIFD.Artist] };
  const dateUploaded = moment(
    exif[piexif.ExifIFD.DateTimeDigitized],
    moment.ISO_8601
  ).toDate();

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
  return { identifier, metadata };
}

const reusedTags: {
  [key: string]: number[];
} = {
  Exif: [
    piexif.ExifIFD.UserComment,
    piexif.ExifIFD.ImageUniqueID,
    piexif.ExifIFD.DateTimeDigitized
  ] as number[],
  "0th": [
    piexif.ImageIFD.ImageID,
    piexif.ImageIFD.ImageDescription,
    piexif.ImageIFD.Artist,
    piexif.ImageIFD.SecurityClassification
  ] as number[]
};

/* Exported for testing */
function preserveOriginalTags(exifObj: ExifObject) {
  const zeroth = exifObj["0th"];
  const exif = exifObj.Exif;
  const preservedTags: { [key: string]: string } = {};
  for (const id of reusedTags["0th"]) {
    preservedTags[id] = zeroth[id];
  }
  for (const id of reusedTags.Exif) {
    preservedTags[id] = exif[id];
  }

  exif[piexif.ExifIFD.UserComment] = JSON.stringify(preservedTags);
}

/* Exported for testing */
function restoreOriginalTags(exifObj: ExifObject) {
  const zeroth = exifObj["0th"];
  const exif = exifObj.Exif;

  const preservedTags = JSON.parse(exif[piexif.ExifIFD.UserComment]) as {
    [key: string]: string;
  };

  for (const key of Object.keys(preservedTags)) {
    const id = Number(key);
    const value = preservedTags[id];
    if (value != null) {
      if (reusedTags["0th"].includes(id)) {
        zeroth[id] = value;
      } else if (reusedTags.Exif.includes(id)) {
        exif[id] = value;
      }
    }
  }
}

export const jpeg: FileTypeHandler = FILETYPE({
  mimeTypes: ["image/jpeg"],
  async serializer(submission: Submission): Promise<Buffer> {
    const content = await (await submission.image()).content();
    const metadata = await submission.metadata();
    const jpegData = content.toString("binary");
    const exifObj = piexif.load(jpegData);
    const identifier = {
      id: submission.id,
      site: submission.site
    };

    preserveOriginalTags(exifObj);
    fromSubmissionInfoToJpegTags(identifier, metadata, exifObj);

    const exifBytes = piexif.dump(exifObj);

    const newJpegData = piexif.insert(exifBytes, jpegData);

    return new Buffer(newJpegData, "binary");
  },

  async deserializer(buffer: Promise<Buffer>): Promise<Submission> {
    const content = await buffer;
    const jpegData = content.toString("binary");
    const exifObj = piexif.load(jpegData);

    const { identifier, metadata } = fromJpegTagsToSubmissionInfo(exifObj);
    restoreOriginalTags(exifObj);

    const exifBytes = piexif.dump(exifObj);
    const restoredJpegData = piexif.insert(exifBytes, jpegData);
    const restoredContent = new Buffer(restoredJpegData, "binary");
    return makeStaticSubmission(identifier, metadata, restoredContent);
  }
});
