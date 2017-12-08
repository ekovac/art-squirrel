(Symbol as any).asyncIterator = Symbol.asyncIterator || Symbol.for("Symbol.asyncIterator");
import {SubmissionMetadata} from './common';
import {FuraffinitySite, FuraffinityConfig} from './sites/furaffinity';
let config: FuraffinityConfig = {
    collectionTarget: 'Pictures/FuraffinityFavorites',
    username: 'digitalfox',
}
let fs = new FuraffinitySite(config);

function sleep(ms:number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function listFavorites() {
    for await (const sub of fs.favorites()) {
        let meta: SubmissionMetadata;
        try {
          meta = await sub.metadata();
        } catch (error) {
          console.error(error);
        }
        await sleep(1000);
        console.log(sub.toString());
    }
}
listFavorites();
