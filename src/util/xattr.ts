import * as xattr from "fs-xattr";
import * as util from "util";

export const get: (
  path: string,
  attr: string
) => Promise<string> = util.promisify(xattr.get);

export const set: (
  path: string,
  attr: string,
  value: string
) => Promise<void> = util.promisify(xattr.set);

export const list: (path: string) => Promise<string[]> = util.promisify(
  xattr.list
);

export async function getAll(path: string): Promise<Map<string, string>> {
  const attrs = await list(path);
  return Promise.all(
    attrs.map(async (attr: string): Promise<[string, string]> => {
      return [attr, await get(path, attr)];
    })
  ).then(tuples => {
    return new Map<string, string>(tuples);
  });
}

export function setAll(path: string, attrs: Map<string, string>) {
  const entries = Array.from(attrs.entries()).map((entry: [string, string]) =>
    set(path, entry[0], entry[1])
  );
  return Promise.all(entries).then(result => {
    return;
  });
}
