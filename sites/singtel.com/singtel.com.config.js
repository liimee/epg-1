const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const axios = require("axios");


dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'singtel.com',
  days: 3,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ date }) {
    return `https://www.singtel.com/etc/singtel/public/tv/epg-parsed-data/${date.format('DDMMYYYY')}.json`
  },
  async parser({ content, channel }) {
    const seasonRegex = /(?: |\()S(\d+)\)?$/

    let programs = []
    const items = parseItems(content, channel)
    for (const item of items) {
      const start = dayjs.tz(item.startDateTime, 'Asia/Singapore')
      const stop = start.add(item.duration, 's')
      const title = item.program.title.replace(seasonRegex, '');
      let tm;

      // if ((parsed.engSeriesName || parsed.seriesName) !== "TBA") {
      const d = await axios.get(`https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(title)}&api_key=${process.env.TMDBKEY}`)
      if (d.data.total_results > 0) {
        // if (parsed.genre != "Sports") {
        let tmres = d.data.results.find(v => (v.name || v.title).toLowerCase().trim().replace(/[^a-z0-9\s]/gi, '') == title.toLowerCase().trim().replace(/[^a-z0-9\s]/gi, ''));
        if (!tmres && d.data.total_results === 1) tmres = d.data.results[0];
        if ((tmres && !tmres.poster_path) && d.data.total_results > 1) {
          let cloned = d.data.results;
          cloned.sort((a, b) => b.popularity - a.popularity);
          tmres = cloned[0];
        }
        if (tmres && tmres.poster_path) tm = 'https://image.tmdb.org/t/p/w500' + tmres.poster_path;
        // }
      }
      // }

      const season = (item.program.title.match(seasonRegex) || [null, null])[1]
      programs.push({
        title,
        category: item.program.subCategory,
        description: item.program.description,
        start,
        stop,
        season: season ? parseInt(season) : null,
        episode: parseInt(item.program.programValues.find(v => v.name == 'MSEPG_Syndicated_Episode_Number').description),
        icon: tm,
        video: {
          present: 'yes',
          colour: 'yes',
          aspect: '16:9',
          quality: 'HDTV'
        },
      })
    }

    return programs
  }
}

function parseItems(content, channel) {
  try {
    const data = JSON.parse(content)
    return data && data[channel.site_id] ? data[channel.site_id] : []
  } catch (err) {
    return []
  }
}
