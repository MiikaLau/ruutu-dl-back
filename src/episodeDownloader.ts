import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';
import { spawn } from 'child_process';
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: () => true,
  ignoreDeclaration: true,
  processEntities: false,
});

export const downloadEpisode = async (episodeId: string, title: string, stream: string | null, res: any) => {
  const xml = await axios.get(`http://gatling.nelonenmedia.fi/media-xml-cache?id=${episodeId}`);
  const parsed = parser.parse(xml.data);
  const playListUrl = parsed.Playerdata[0].Clip[0].AppleMediaFiles[0].AppleMediaFile[0];
  const tokenUrl = `https://gatling.nelonenmedia.fi/auth/access/v2?stream=${playListUrl}&gatling_token=`;
  const token = await axios.get(tokenUrl);
  const videoUrl = token.data;
  res.setHeader('Content-disposition', `attachment; filename=${title}.mp4`);
  res.setHeader('Content-type', 'video/mp4');
  return new Promise<void>((resolve, reject) => {
    let args = [];
    if (stream) {
      args = ['-i', videoUrl, '-movflags', 'isml+frag_keyframe', '-f', 'ismv', 'pipe:1'];
    }
    else {
      args = ['-i', videoUrl, '-c', 'copy', '-f', 'mpegts', 'pipe:1'];
    }
    const ffMpegProcess = spawn(ffmpegInstaller.path, args)
    if (ffMpegProcess.stderr) {
      ffMpegProcess.stderr.setEncoding('utf8');
    }
    ffMpegProcess.on('exit', function (code, signal) {
      res.end();
      if (signal) {
        reject('ffmpeg was killed with signal ' + signal);
      } else if (code) {
        reject('ffmpeg exited with code ' + code);
      } else {
        resolve();
      }
    });

    ffMpegProcess.stdout.on('data', function (data) {
      res.write(data);
    });

    ffMpegProcess.stdout.on('close', function () {
      console.log("STDOUT CLOSED");
    });

    const buff = [];
    ffMpegProcess.stderr.on('data', function (data) {
      buff.push(data);
      if (buff.length > 100) buff.shift();
    });

    ffMpegProcess.stderr.on('close', function () {
      console.log("STDERR CLOSED");
    });

    res.on('close', () => {
      ffMpegProcess.kill();
    })
  })

}
