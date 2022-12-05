import { XMLParser } from 'fast-xml-parser';
import { SearchItem } from './interfaces/SearchItem';
import { decode } from 'html-entities';

const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: () => true,
  ignoreDeclaration: true,
  processEntities: false,
});

export const parseSearch = (searchXml: string) => {
  const data = parser.parse(searchXml);
  const mainJson = data['!doctype'][0].html[0].body[0].script[0]['#text'];
  const mainObj = JSON.parse(mainJson);
  const pageJson = mainObj.pageStore.pages['page-700'].json.replaceAll('&quot;', '"');
  const page = JSON.parse(pageJson);
  const searchComponent = page.components.find(page => page.type === 'Container');
  const searchItems: Array<SearchItem> = searchComponent.content.items[0].suggestions;
  const filteredItems = searchItems
    .sort((a, b) => a.title.localeCompare(b.title))
    .filter(item => !item.label)
    .map((item) => { return { ...item, title_original: decode(item.title_original), title: decode(item.title) } as SearchItem });
  return filteredItems;
}
