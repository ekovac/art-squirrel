type StringObj = { [key: string]: string };
export function mapToObject(map: Map<string, string>): StringObj {
  const newObject: StringObj = {};
  for (const [key, value] of map.entries()) {
    newObject[key] = value;
  }
  return newObject;
}

export function objectToMap(object: StringObj): Map<string, string> {
  return new Map<string, string>(Object.entries(object));
}
