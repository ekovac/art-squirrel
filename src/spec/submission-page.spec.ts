import 'jasmine';

import fsExtra from 'fs-extra';

import {scrapePage, SubmissionPage} from '../furaffinity/submission-page';

describe('scrapeSubmissionPage', () => {
  let fileContent: string;
  let submissionPage: SubmissionPage;

  function assertProperty(prop: string, value: any, re: boolean = false) {
    if (!re) {
      it(prop, () => {
        expect((submissionPage as any)[prop]).toEqual(value);
      });
    } else {
      it(prop, () => {
        expect((submissionPage as any)[prop]).toMatch(value);
      });
    }
  }

  describe('on an image submission', () => {
    beforeEach(() => {
      fileContent = fsExtra.readFileSync(
          'test_data/submission-image.html', {encoding: 'utf-8'});
      submissionPage = scrapePage(fileContent);
    });

    describe('should scrape', () => {
      assertProperty('title', 'Busted.');
      assertProperty('artist', 'Nicnak044');
      assertProperty('rating', 'General rating');
      assertProperty('posted', 'Apr 30th, 2019 10:01 PM');
      assertProperty(
          'downloadUrl',
          '//d.facdn.net/art/nicnak044/1556679661/1556679661.nicnak044_rouge_1_wm.png');
      assertProperty('keywords', [
        'boobs', 'tits',          'titties',     'boobies',       'breasts',
        'rouge', 'rouge_the_bat', 'bat',         'wings',         'feline',
        'cat',   'lynx',          'nicole',      'nicolethelynx', 'nicnak044',
        'crush', 'furry_crush',   'rougethebat', 'furrycrush',    'personal',
        'art',   'personal_art',  'sonic',       'fanart'
      ]);
      assertProperty('folders', [
        'Art Sorted By Year -\n                                                                            2019',
        'Commissions -\n                                                                            Full Character Illustration',
        'Characters -\n                                                                            Nicole',
        'Personal Art', 'Fanart'
      ]);
      assertProperty('description', /^The first of a 3 part series/, true);
    });
  });
  describe('on a txt submission', () => {
    beforeEach(() => {
      fileContent = fsExtra.readFileSync(
          'test_data/submission-txt.html', {encoding: 'utf-8'});
      submissionPage = scrapePage(fileContent);
    });

    describe('should scrape', () => {
      assertProperty('title', 'Busted.');
      assertProperty('artist', 'Nicnak044');
      assertProperty('rating', 'General rating');
      assertProperty('posted', 'Apr 30th, 2019 10:01 PM');
      assertProperty(
          'downloadUrl',
          '//d.facdn.net/art/nicnak044/1556679661/1556679661.nicnak044_rouge_1_wm.png');
      assertProperty('keywords', [
        'boobs', 'tits',          'titties',     'boobies',       'breasts',
        'rouge', 'rouge_the_bat', 'bat',         'wings',         'feline',
        'cat',   'lynx',          'nicole',      'nicolethelynx', 'nicnak044',
        'crush', 'furry_crush',   'rougethebat', 'furrycrush',    'personal',
        'art',   'personal_art',  'sonic',       'fanart'
      ]);
      assertProperty('folders', [
        'Art Sorted By Year -\n                                                                            2019',
        'Commissions -\n                                                                            Full Character Illustration',
        'Characters -\n                                                                            Nicole',
        'Personal Art', 'Fanart'
      ]);
      assertProperty('description', /^The first of a 3 part series/, true);
    });
  });
});