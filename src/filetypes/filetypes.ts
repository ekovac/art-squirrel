import { png } from "./png";
import { jpeg } from "./jpeg";
import * as detectFileType from "file-type";
import { Submission } from "../common";

const fileTypeHandlers = [png, jpeg];
export async function processForOutput(
  submission: Submission
): Promise<{ content: Buffer; ext: string }> {
  const content = await (await submission.image()).content();
  const fileType = detectFileType(content);
  let modifiedContent: Buffer = content;

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
