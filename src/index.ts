(Symbol as any).asyncIterator = Symbol.asyncIterator || Symbol.for("Symbol.asyncIterator");
import {FuraffinitySite, FuraffinityConfig} from './sites/furaffinity'
let config: FuraffinityConfig = {
    collectionPath: 'Pictures/FuraffinityFavorites',
    username: 'digitalfox',
}
let fs = new FuraffinitySite(config);
async function listFavorites() {
    for await (const fave of fs.favorites()) {
        console.log(fave.id);
    }
}
listFavorites();
