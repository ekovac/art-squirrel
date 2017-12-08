(Symbol as any).asyncIterator = Symbol.asyncIterator || Symbol.for("Symbol.asyncIterator");
import {SubmissionMetadata, Config} from './common';
import {FuraffinitySite, FuraffinityConfig} from './sites/furaffinity';
import {Filesystem} from './collections/filesystem';

let config: Config = {
    sites: [{
      type: 'furaffinity',
      config: {
        target: 'filesystem',
        username: 'digitalfox',
      },
    }],
    collections: [{
      type: 'filesystem',
      config: {},
    }]
};

let site = new FuraffinitySite(config.sites[0].config);
let collection = new Filesystem(config.collections[0].config);

function sleep(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function listFavorites() {
    for await (const sub of site.favorites()) {
      await collection.store(sub);
      await sleep(1000);
    }
}
listFavorites();
