import NodeCache from 'node-cache';
export const searchCache = new NodeCache({ stdTTL: 180, checkperiod: 180 });
export const episodeCache = new NodeCache({ stdTTL: 180, checkperiod: 180 });
