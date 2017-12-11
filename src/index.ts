(Symbol as any).asyncIterator =
  Symbol.asyncIterator || Symbol.for("Symbol.asyncIterator");
import { sites } from "./sites/sites";
sites;
import { collections } from "./collections/collections";
collections;
import { loadConfig } from "./config";
import { ArtSquirrel } from "./art_squirrel";

const { config, path } = loadConfig();
const artSquirrel = new ArtSquirrel(config, path);
