const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

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
  parser({ content, channel }) {
    const seasonRegex = / S(\d+)$/
    
    let programs = []
    const items = parseItems(content, channel)
    items.forEach(item => {
      const start = dayjs.tz(item.startDateTime,'Asia/Singapore')
      const stop = start.add(item.duration, 's')

      const season = (item.program.title.match(seasonRegex) || [null, null])[1]
      programs.push({
        title: item.program.title.replace(seasonRegex, ''),
        category: item.program.subCategory,
        description: item.program.description,
        start,
        stop,
        season: season ? parseInt(season) : null,
        episode: parseInt(item.programValues.find(v => v.name == 'MSEPG_Syndicated_Episode_Number').description)
      })
    })

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
