import { ArgumentParser } from "argparse";


function setupParser(parser: ArgumentParser) {
  parser.add_argument("-k", "--key", {
    required: true, type: String}
  );
}

const executeFetch = async (options: any) => {
  return Promise.resolve();
}

export const module  = {
  name: 'twitter',
  setupParser,
  executeFetch
};