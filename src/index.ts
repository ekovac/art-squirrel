import {FuraffinitySite, FuraffinityConfig} from './sites/furaffinity'
let config: FuraffinityConfig = {
    collectionPath: 'Pictures/FuraffinityFavorites',
    username: 'digitalfox',
}
let fs = new FuraffinitySite(config);
