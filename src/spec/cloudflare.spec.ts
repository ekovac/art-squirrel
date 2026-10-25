import 'jasmine';

import {CloudflareChallengeError, throwIfCloudflareChallenge} from '../cloudflare';

describe('Cloudflare challenge detection', () => {
  it('should throw on a challenge response', () => {
    const response = new Response('<title>Just a moment...</title>', {
      status: 403,
      headers: {'cf-mitigated': 'challenge'},
    });
    expect(() => throwIfCloudflareChallenge(response))
        .toThrowError(CloudflareChallengeError);
  });

  it('should not throw on a normal response', () => {
    const response = new Response('<title>Furaffinity</title>', {status: 200});
    expect(() => throwIfCloudflareChallenge(response)).not.toThrow();
  });

  it('should not throw on a non-challenge error response', () => {
    const response = new Response('Not found', {status: 404});
    expect(() => throwIfCloudflareChallenge(response)).not.toThrow();
  });
});
