import { png } from "./png";
import { jpeg } from "./jpeg";
import { txt } from "./txt";
import * as detectFileType from "file-type";
import { FileTypeResult } from "file-type";
import { Submission, FiletypeHandler } from "../common";
import * as detectCharacterEncoding from "detect-character-encoding";

const fileTypeHandlers = [png, jpeg, txt];

function contentIsValidText(buf: Buffer): boolean {
  const detectionResult: {
    encoding: string;
    confidence: number;
  } = detectCharacterEncoding(buf);
  return detectionResult.confidence > 25;
}

function identifyFileType(content: Buffer): FileTypeResult {
  let fileType = detectFileType(content);
  if (!fileType) {
    if (contentIsValidText(content)) {
      fileType = { mime: "text/plain", ext: "txt" };
    } else {
      fileType = { mime: "application/octet-stream", ext: "dat" };
    }
  }
  return fileType;
}

function selectHandler(fileType: FileTypeResult): FiletypeHandler | null {
  for (const handler of fileTypeHandlers) {
    if (handler.mimeTypes.includes(fileType.mime)) {
      return handler;
    }
  }
  return null;
}

export async function processForInput(
  resource: string,
  content: Promise<Buffer>
): Promise<Submission> {
  const fileType = identifyFileType(await content);
  const fileTypeHandler = selectHandler(fileType);
  let submission: Submission = null;
  if (!fileTypeHandler) {
    console.warn(
      "No handler for MIME type: '%s', unable to tag.",
      fileType.mime
    );
  } else {
    submission = await fileTypeHandler.deserializer(content);
  }
  return submission;
}

export async function processForOutput(
  submission: Submission
): Promise<{ content: Buffer; ext: string }> {
  let content = await (await submission.image()).content();
  const fileType = identifyFileType(content);
  const fileTypeHandler = selectHandler(fileType);

  if (!fileTypeHandler) {
    console.warn(
      "No handler for MIME type: '%s', unable to tag.",
      fileType.mime
    );
  } else {
    content = await fileTypeHandler.serializer(submission);
  }

  return Promise.resolve({ content, ext: fileType.ext });
}
