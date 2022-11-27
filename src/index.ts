import express from 'express';
import cors from 'cors'
import axios from 'axios';
import httpProxy from 'http-proxy';
import * as cache from './cache';
import { parseSearch } from './searchParser';
import { parseEpisodes } from './episodeParser';
import { downloadEpisode } from './episodeDownloader';
import { Episodes } from './interfaces/Episodes';


const app = express();
const port = 8000;

const frontend = 'http://127.0.0.1:3000';
const proxy = httpProxy.createProxyServer();
proxy.on('error', function (err, _req, res) {
  res.send(`<html><h1>Failed to reach frontend</h1><p>${err}</p></html>`)
});

app.use(express.json())
app.use(cors());

app.get('/search_items', (_req, res) => {
  const key = `searchItems`;
  if (cache.searchCache.has(key)) res.send(cache.searchCache.get(key));
  else {
    axios.get('https://www.ruutu.fi/haku')
      .then((axiosRes) => {
        try {
          const searchItems = parseSearch(axiosRes.data);
          cache.searchCache.set(key, searchItems);
          res.send(searchItems)
        }
        catch (err) {
          console.log(err);
          res.status(500).send();
        }
      });
  }
});

const getEpisodes = async (key: string, titleId: string): Promise<[Episodes, string | null]> => {
  return axios.get(`https://prod-component-api.nm-services.nelonenmedia.fi/api/v1/series/${titleId}?app=ruutu&client=web&userroles=Logged_In_User`)
    .then(async (axiosRes) => {
      try {
        const episodeItems = await parseEpisodes(axiosRes.data);
        cache.episodeCache.set(key, episodeItems);
        return [episodeItems, null];
      }
      catch (err) {
        console.log(err);
        return [{}, err];
      }
    });
}

app.get('/episodes/:title_id', async (_req, res) => {
  if (_req.params.title_id === '0') {
    res.send({});
    return;
  }
  const key = `episodes_${_req.params.title_id}`;
  if (cache.episodeCache.has(key)) res.send(cache.episodeCache.get(key));
  else {
    const [episodes, err] = await getEpisodes(key, _req.params.title_id);
    if (err) {
      res.status(500).send();
    }
    else res.send(episodes);
  }
});

app.get('/get_episode/:title_id/:episode_id', async (_req, res) => {
  try {
    const epsKey = `episodes_${_req.params.title_id}`;
    let title = _req.params.episode_id;
    let episodes: Episodes = {};
    if (cache.episodeCache.has(epsKey)) {
      episodes = cache.episodeCache.get(epsKey) as Episodes;
    }
    else {
      let err: string | null = null;
      [episodes, err] = await getEpisodes(epsKey, _req.params.title_id);
      if (err) {
        res.status(500).send();
      }
    }
    Object.keys(episodes).forEach((series) => {
      const foundEp = episodes[series].find(ep => ep.id === Number(title))
      if (foundEp) title = foundEp.title;
    });
    await downloadEpisode(_req.params.episode_id, title, res);
  }
  catch (err) {
    console.log(err);
    res.status(500).send();
  }
});


app.get('/cachedata', (_req, res) => {
  const stats = {
    episodeCache: cache.episodeCache.getStats(),
    searchItemsCache: cache.searchCache.getStats(),
  };
  res.send(stats);
});

app.all('/*', (req, res) => {
  proxy.web(req, res, { target: frontend });
})

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
