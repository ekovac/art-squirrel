(Symbol as any).asyncIterator =
  Symbol.asyncIterator || Symbol.for("Symbol.asyncIterator");
import { sites } from "./sites/sites";
sites;
import { collections } from "./collections/collections";
collections;
import { loadConfig } from "./config";
import { ArtSquirrel } from "./art_squirrel";
import * as events from "events";

const { config, path } = loadConfig();
const artSquirrel = new ArtSquirrel(config, path);
const eventEmitter = new events.EventEmitter();

process.on("unhandledRejection", r => console.log(r));
artSquirrel.process().then(() => {
  eventEmitter.emit("finished");
});
const timeout = setInterval(() => {}, 100);
eventEmitter.on("finished", () => {
  clearInterval(timeout);
  console.log("Completed.");
});

