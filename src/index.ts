import {ArgumentParser} from 'argparse';

import * as Furaffinity from './furaffinity/index';
import * as Twitter from './twitter/index';

const modules = [Furaffinity.module, Twitter.module];

const parser = new ArgumentParser({
  prog: 'art-squirrel',
  description: 'A backup tool for various art websites.',
});

const subparsers = parser.add_subparsers({title: 'source', dest: 'source'});

for (const module of modules) {
  const subparser = subparsers.add_parser(module.name);
  module.setupParser(subparser); 
}

const options = parser.parse_args();

for (const module of modules) {
  if (module.name === options.source) {
    module.executeFetch(options);
    break;
  }
}