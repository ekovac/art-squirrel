import {ArgumentParser} from 'argparse';
import fileType from 'file-type';
import fsExtra from 'fs-extra';
import fetch, {RequestInit} from 'node-fetch';
import path from 'path';
import process from 'process';
import url from 'url';

import * as Furaffinity from './furaffinity/index';

const modules = [Furaffinity.module];

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