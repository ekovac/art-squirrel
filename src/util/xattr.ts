import * as fsx from "fs-extended-attributes";
import * as util from "util";

export const get: (
  path: string,
  attr: string
) => Promise<string> = util.promisify(fsx.get);

export const set: (
  path: string,
  attr: string,
  value: string
) => Promise<void> = util.promisify(fsx.set);
