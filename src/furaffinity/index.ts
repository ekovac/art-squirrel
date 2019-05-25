import {RequestOptions} from 'https';
import fetch, {RequestInfo, RequestInit} from 'node-fetch';
import url from 'url';

import {FavoritesPage, scrapePage as scrapeFavoritesPage} from './favorites-page';
import {scrapePage as scrapeSubmissionPage, SubmissionPage} from './submission-page';
export {SubmissionPage} from './submission-page';

const BASE_URL = 'https://www.furaffinity.net/';


async function getFavoritesPage(
    uri: string, options: RequestInit): Promise<FavoritesPage> {
  const response = await fetch(uri, options);
  const pageContent = await response.text();
  return scrapeFavoritesPage(pageContent);
}

export async function getSubmissionPage(
    id: string, options: RequestInit): Promise<SubmissionPage> {
  const uri = url.resolve(BASE_URL, `/view/${id}/`);
  const response = await fetch(uri, options);
  const pageContent = await response.text();
  const submissionPage = await scrapeSubmissionPage(pageContent);
  submissionPage.sourceUrl = uri;
  return submissionPage;
}

export async function*
    getFavoritesIds(username: string, options: RequestInit):
        AsyncIterableIterator<string> {
  let pageUrl = `/favorites/${username}`;

  do {
    let fullUrl = url.resolve(BASE_URL, pageUrl);
    const page = await getFavoritesPage(fullUrl, options);
    for (const submissionId of page.submissions) {
      yield submissionId;
    }
    pageUrl = page.nextPageUrl;
  } while (pageUrl);
  return;
}
