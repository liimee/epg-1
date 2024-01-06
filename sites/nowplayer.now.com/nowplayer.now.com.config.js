const axios = require("axios");
const cheerio = require("cheerio");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

module.exports = {
  site: "nowplayer.now.com",
  days: 2,
  url: function ({ channel, date }) {
    const diff = date.diff(dayjs.utc().startOf("d"), "d") + 1;

    return `http://nowplayer.now.com/tvguide/epglist?channelIdList[]=${channel.site_id}&day=${diff}`;
  },
  request: {
    headers({ channel }) {
      return {
        Cookie:
          `LANG=${channel.lang}; Expires=null; Path=/; Domain=nowplayer.now.com`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
      };
    },
    timeout: 60000,
  },
  parser: async function ({ content }) {
    let programs = [];
    const items = parseItems(content);
    const iterate = items.map((item) => {
      return (async () => {
        const parsed = await axios.get(
          `http://nowplayer.now.com/tvguide/epgprogramdetail?programId=${item.vimProgramId}`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
            },
            withCredentials: true,
          },
        ).then((r) => r.data).catch(() => {});

        if (parsed) {
          let tm = parsed.portraitImage &&
              `https://images.now-tv.com/shares/epg_images/${parsed.portraitImage}`;
          const d = await axios.get(`https://api.themoviedb.org/3/search/${parsed.genre == "Movies" || parsed.episodic !== "Y" ? 'movie' : 'tv'}?query=${encodeURIComponent(parsed.engSeriesName || parsed.seriesName)}&api_key=${process.env.TMDBKEY}`)
          if(d.data.total_results > 0) {
            if(parsed.genre != "Sports") {
              let tmres = d.data.results.find(v => (v.name || v.title).toLowerCase().trim().replace(/[^a-z0-9\s]/gi, '') == (parsed.engSeriesName || parsed.seriesName).toLowerCase().trim().replace(/[^a-z0-9\s]/gi, ''));
              if(!tmres) tmres = d.data.results[0];
              if(!tmres.poster_path && d.data.total_results > 1) {
                let cloned = d.data.results;
                cloned.sort((a, b) => b.popularity-a.popularity);
                tmres = cloned[0];
              }
              if(tmres && tmres.poster_path) tm = 'https://image.tmdb.org/t/p/w500' + tmres.poster_path;
            }
          }
          
          programs.push({
            title: parsed.engSeriesName || parsed.seriesName,
            start: parseStart(item),
            stop: parseStop(item),
            episode: parsed.episodeNum,
            categories: (parsed.episodic !== "Y" && parsed.genre != "Movies") &&
                parsed.genre != "Sports"
              ? ["Movie", parsed.genre, ...(parsed.subGenre || "").split("/")]
              : [
                parsed.genre.replace("Movies", "Movie"),
                ...(parsed.subGenre || "").split("/"),
              ],
            description: parsed.engSynopsis,
            sub_title: parsed.genre == "Sports"
              ? parsed.engProgName.replace(
                new RegExp(
                  `^${parsed.engSeriesName || parsed.seriesName}\\s*-?`,
                ),
                "",
              ).replace(/^E\d+\s+-\s*/i, "")
              : parsed.engProgName.replace(/^E\d+\s+-\s*/i, ""),
            rating: {
              value: parsed.certification,
              system: "TELA",
            },
            season: ((parsed.episodeName || parsed.progName || "").match(
              /S(\d+)E\d+/i,
            ) ||
              [null, null])[1],
            icon: tm,
            actors: parseList(parsed.actor),
            director: parsed.director,
          });
        }
      })();
    });

    await Promise.all(iterate);

    return programs;
  },
  async channels({ lang }) {
    const html = await axios
      .get(
        `https://api.allorigins.win/raw?url=${
          encodeURIComponent("https://nowplayer.now.com/channels")
        }`,
        { headers: { Accept: "text/html" } },
      )
      .then((r) => r.data)
      .catch(console.log);

    const $ = cheerio.load(html);
    const channels = $("body > div.container > .tv-guide-s-g > div > div")
      .toArray();

    return channels.map((item) => {
      const $item = cheerio.load(item);
      return {
        lang,
        site_id: $item(".guide-g-play > p.channel").text().replace("CH", ""),
        name: $item(".thumbnail > a > span.image > p").text(),
      };
    });
  },
};

function parseStart(item) {
  return dayjs(item.start);
}

function parseStop(item) {
  return dayjs(item.end);
}

function parseList(item) {
  return typeof item === "string" ? item.split(/,\s*/gi) : null;
}

function parseItems(content) {
  const data = JSON.parse(content);
  if (!data || !Array.isArray(data)) return [];

  return Array.isArray(data[0]) ? data[0] : [];
}
