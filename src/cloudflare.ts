export class CloudflareChallengeError extends Error {
  constructor(public readonly url: string) {
    super(
      `Cloudflare served a challenge page instead of ${url}; ` +
        "requests are being blocked.",
    );
    this.name = "CloudflareChallengeError";
  }
}

// Cloudflare marks challenge responses (managed, JS, and interactive) with
// the cf-mitigated header; see
// https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response/
export function throwIfCloudflareChallenge(response: Response) {
  if (response.headers.get("cf-mitigated") === "challenge") {
    throw new CloudflareChallengeError(response.url);
  }
}
