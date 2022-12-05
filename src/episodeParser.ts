import axios from "axios";
import { Episode, Episodes } from "./interfaces/Episodes";
import { PageResponse, PageResponseComponent } from "./interfaces/PageResponse";

export const parseEpisodes = async (pageResponse: PageResponse, isVideo: boolean): Promise<Episodes> => {
  let episodes = {};
  if (pageResponse.components && pageResponse.components.find(comp => comp.type === 'TabContainer')) {
    // Seasons are in tabs
    const tabContainer = pageResponse.components.find(comp => comp.type === 'TabContainer');
    episodes = await fetchEpisodeInfos(tabContainer.content.items);
  }
  else if (pageResponse.components && pageResponse.components.find(comp => comp.type === 'Carousel')) {
    // Seasons are in carousels
    const carousels = pageResponse.components
      .filter(comp => comp.type === 'Carousel')
      .filter(comp => comp.content.default_item_style === 'CardHoverbox')
      .filter(comp => comp.label.text.includes('Kausi'));
    if (carousels.length > 0) {
      episodes = await fetchEpisodeInfos(carousels);
    }
    else if (pageResponse.components && pageResponse.components.find(comp => comp.type === 'Grid')) {
      // Single episode / movie
      const card = pageResponse.components.find(comp => comp.type === 'Grid');
      episodes = await fetchEpisodeInfos([card])
    }
    else if (isVideo) {
      const title = pageResponse.metadata.title;
      const description = pageResponse.metadata.meta.find(el => el.name && el.name === 'description').content;
      const ep = {
        id: pageResponse.parent_page ? pageResponse.parent_page.id : 0,
        title,
        description,
      };
      return {
        [title]: [ep]
      }
    }
    else {
      console.log("WEIRD PAGE:", pageResponse.components);
    }
  }
  return episodes;
}

const fetchEpisodeInfos = async (items: PageResponseComponent[]) => {
  const urls = items.map((item) => {
    let url = item.content.query.url + '?';
    Object.keys(item.content.query.params).forEach((param, idx, arr) => {
      if (idx === arr.length - 1) {
        url += `${param}=${item.content.query.params[param]}`;
      }
      else {
        url += `${param}=${item.content.query.params[param]}&`;
      }

    });
    url += '&limit=100';
    const label = item.label ? item.label.text : (item.content.items[0] as any).title;
    return { url, label };
  });
  const responses = await Promise.all(urls.map(async (url) => {
    return {
      label: url.label,
      response: await axios.get(url.url)
    }
  }));
  let episodes: Episodes = {};
  responses.forEach((res) => {
    const eps: Array<Episode> = res.response.data.items
      .filter(item => !item.sticker)
      .map((item) => {
        return {
          id: item.link ? item.link.target.value : item.id,
          title: item.title,
          description: item.description,
        }
      });
    episodes[res.label] = eps;
  });
  return episodes;
}
