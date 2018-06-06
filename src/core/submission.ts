import { Fetchable, StaticFetchable } from "./fetchable";

export interface SubmissionMetadata {
  imageUrl: string;
  title: string;
  dateUploaded: Date;
  artist: {
    name: string;
    url?: string;
  };
  tags: Map<string, string>;
}

export interface SubmissionIdentifier {
  readonly id: string;
  readonly site: string;
  readonly resource?: string;
}

export interface Submission extends SubmissionIdentifier {
  image(): Promise<Fetchable>;
  metadata(): Promise<SubmissionMetadata>;
}

export function makeStaticSubmission(
  identifier: SubmissionIdentifier,
  metadata: SubmissionMetadata,
  buffer?: Buffer
): Submission {
  const fetchable = new StaticFetchable(buffer);
  return {
    ...identifier,
    image: () => Promise.resolve(fetchable),
    metadata: () => Promise.resolve(metadata)
  };
}
