import {ArgumentParser} from 'argparse';

import * as Furaffinity from './furaffinity/index';
import * as Twitter from './twitter/index';

const modules = [Furaffinity.module, Twitter.module];

const parser = new ArgumentParser({
  prog: 'art-squirrel',
  description: 'A backup tool for various art websites.',
});

const subparsers = parser.addSubparsers({title: 'source', dest: 'source'});

for (const module of modules) {
  const subparser = subparsers.addParser(module.name);
  module.setupParser(subparser); 
}

const options = parser.parseArgs();

for (const module of modules) {
  if (module.name === options.source) {
    module.executeFetch(options);
    break;
  }
}