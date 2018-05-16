import { png } from "./png";
import { jpeg } from "./jpeg";
import * as detectFileType from "file-type";
import { Submission } from "../common";
import * as detectCharacterEncoding from "detect-character-encoding";

const fileTypeHandlers = [png, jpeg];

function contentIsValidText(buf: Buffer): boolean {
  const detectionResult: {
    encoding: string;
    confidence: number;
  } = detectCharacterEncoding(buf);
  return detectionResult.confidence > 25;
}

export async function processForOutput(
  submission: Submission
): Promise<{ content: Buffer; ext: string }> {
  const content = await (await submission.image()).content();
  let fileType = detectFileType(content);
  let modifiedContent: Buffer = content;

  if (!fileType) {
    if (contentIsValidText(content)) {
      fileType = { mime: "text/plain", ext: "txt" };
    } else {
      fileType = { mime: "application/octet-stream", ext: "dat" };
    }
  }

  for (const handler of fileTypeHandlers) {
    if (handler.mimeTypes.includes(fileType.mime)) {
      modifiedContent = await handler.serializer(submission);
      break;
    }
  }

  if (modifiedContent == content) {
    console.warn(
      "No handler for MIME type: '%s', unable to tag.",
      fileType.mime
    );
  }

  return Promise.resolve({ content: modifiedContent, ext: fileType.ext });
}
