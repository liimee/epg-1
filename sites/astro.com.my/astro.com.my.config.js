const axios = require("axios");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

const API_ENDPOINT = `https://contenthub-api.eco.astro.com.my`;

module.exports = {
  site: "astro.com.my",
  days: 2,
  url: function ({ channel }) {
    return `${API_ENDPOINT}/channel/${channel.site_id}.json`;
  },
  async parser({ content, date, channel }) {
    const programs = [];
    const items = parseItems(content, date);
    for (let item of items) {
      const start = dayjs.utc(item.datetimeInUtc);
      if(channel.xmltv_id == "LifetimeAsia.us") {
	      start.subtract(10, "m")
			}
      const duration = parseDuration(item.duration);
      const stop = start.add(duration, "s");
      const details = await loadProgramDetails(item);
      programs.push({
        title: details.title.replace(/(S\d+,?\s*)?Ep?\d+/, ""),
        sub_title: item.subtitles,
        description: details.longSynopsis || details.shortSynopsis,
        actors: parseList(details.cast),
        directors: parseList(details.director),
        icon: details.imageUrl,
        rating: parseRating(details),
        categories: details.filter == "Filter/42"
          ? ["Movie", ...parseCategories(details).filter((v) => v !== "Movies")]
          : parseCategories(details),
        episode: parseEpisode(details),
        season: parseSeason(details),
        start: start,
        stop: stop,
      });
    }

    return programs;
  },
};

function parseEpisode(item) {
  const [_, number] = item.title.match(/Ep\s*(\d+)$/) || [null, null];

  return number ? parseInt(number) : null;
}

function parseSeason(item) {
  const [_, season] = item.title.match(/ S(\d+)/) || [null, null];

  return season ? parseInt(season) : null;
}

function parseList(list) {
  return typeof list === "string" ? list.split(",") : [];
}

function parseRating(details) {
  return details.certification
    ? {
      system: "LPF",
      value: details.certification,
    }
    : null;
}

function parseItems(content, date) {
  try {
    const data = JSON.parse(content);
    const schedules = data.response.schedule;

    return schedules[date.format("YYYY-MM-DD")] || [];
  } catch (e) {
    return [];
  }
}

function parseDuration(duration) {
  const match = duration.match(/(\d{2}):(\d{2}):(\d{2})/);
  const hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const seconds = parseInt(match[3]);

  return hours * 3600 + minutes * 60 + seconds;
}

function parseCategories(details) {
  const genres = {
    "filter/1": "Academic",
    "filter/2": "Action",
    "filter/3": "Adventure",
    "filter/4": "Anime",
    "filter/5": "Animation",
    "filter/6": "Automotive",
    "filter/7": "Award Show",
    "filter/8": "Band",
    "filter/9": "Badminton",
    "filter/10": "Basketball",
    "filter/11": "Biography",
    "filter/12": "Cartoons",
    "filter/14": "Children",
    "filter/15": "Classical",
    "filter/16": "Comedy",
    "filter/17": "Concerts",
    "filter/18": "Food",
    "filter/19": "Crime",
    "filter/20": "Culture",
    "filter/21": "Current Affairs",
    "filter/22": "Dance",
    "filter/23": "Documentary",
    "filter/24": "Drama",
    "filter/25": "Educational",
    "filter/26": "Entertainment",
    "filter/27": "Family",
    "filter/28": "Fashion",
    "filter/29": "Business",
    "filter/31": "Football",
    "filter/32": "Golf",
    "filter/33": "Game Show",
    "filter/34": "Highlights",
    "filter/35": "History",
    "filter/36": "Horror",
    "filter/38": "Lifestyle",
    "filter/39": "Live Action",
    "filter/41": "Motorsport",
    "filter/42": "Movies",
    "filter/43": "Music",
    "filter/44": "Musical",
    "filter/45": "Mystery",
    "filter/46": "Nature",
    "filter/47": "News",
    "filter/49": "Orchestra",
    "filter/53": "Political",
    "filter/54": "Pop",
    "filter/55": "Pre-school",
    "filter/56": "Reality Show",
    "filter/57": "Religious",
    "filter/60": "Romance",
    "filter/61": "Rugby",
    "filter/62": "Science",
    "filter/63": "Sci-Fi",
    "filter/64": "Self-Improvement",
    "filter/65": "Special Interest",
    "filter/66": "Sports",
    "filter/68": "Talk Show",
    "filter/69": "Thriller",
    "filter/70": "Travel",
    "filter/71": "TV Show/Series",
    "filter/72": "Variety",
    "filter/73": "Wellness",
    "filter/74": "Western",
    "filter/75": "Series",
    "filter/76": "Medical",
    "filter/77": "Further Learning",
    "filter/78": "Shopping",
    "filter/79": "Handicraft",
    "filter/80": "Living & Space",
    "filter/81": "Folks",
    "filter/82": "Jazz",
    "filter/83": "Special Event",
    "filter/84": "Weather Report",
    "filter/85": "Aquatics",
    "filter/86": "Home",
    "filter/87": "Magazine",
    "filter/88": "Athletics",
    "filter/89": "Cricket",
    "filter/90": "Martial Arts",
    "filter/91": "Tennis",
    "filter/92": "Winter Sports",
    "filter/93": "Wrestling",
    "filter/94": "Hockey",
    "filter/95": "Classic",
    "filter/96": "eSports",
    "filter/97": "Reality",
  };

  return Array.isArray(details.subFilter)
    ? [
      genres[details.filter.toLowerCase()],
      ...details.subFilter.map((g) => genres[g.toLowerCase()]).filter(Boolean),
    ]
    : [];
}

async function loadProgramDetails(item) {
  const url =
    `${API_ENDPOINT}/api/v1/linear-detail?siTrafficKey=${item.siTrafficKey}`;
  const data = await axios
    .get(url)
    .then((r) => r.data)
    .catch((err) => {});
  if (!data) return {};

  return data.response || {};
}

/* const filterMap = {
	"filterMap": {
		"filter/1": "Academic",
		"filter/2": "Action",
		"filter/3": "Adventure",
		"filter/4": "Anime",
		"filter/5": "Animation",
		"filter/6": "Automotive",
		"filter/7": "Award Show",
		"filter/8": "Band",
		"filter/9": "Badminton",
		"filter/10": "Basketball",
		"filter/11": "Biography",
		"filter/12": "Cartoons",
		"filter/14": "Children",
		"filter/15": "Classical",
		"filter/16": "Comedy",
		"filter/17": "Concerts",
		"filter/18": "Food",
		"filter/19": "Crime",
		"filter/20": "Culture",
		"filter/21": "Current Affairs",
		"filter/22": "Dance",
		"filter/23": "Documentary",
		"filter/24": "Drama",
		"filter/25": "Educational",
		"filter/26": "Entertainment",
		"filter/27": "Family",
		"filter/28": "Fashion",
		"filter/29": "Business",
		"filter/31": "Football",
		"filter/32": "Golf",
		"filter/33": "Game Show",
		"filter/34": "Highlights",
		"filter/35": "History",
		"filter/36": "Horror",
		"filter/38": "Lifestyle",
		"filter/39": "Live Action",
		"filter/41": "Motorsport",
		"filter/42": "Movies",
		"filter/43": "Music",
		"filter/44": "Musical",
		"filter/45": "Mystery",
		"filter/46": "Nature",
		"filter/47": "News",
		"filter/49": "Orchestra",
		"filter/53": "Political",
		"filter/54": "Pop",
		"filter/55": "Pre-school",
		"filter/56": "Reality Show",
		"filter/57": "Religious",
		"filter/60": "Romance",
		"filter/61": "Rugby",
		"filter/62": "Science",
		"filter/63": "Sci-Fi",
		"filter/64": "Self-Improvement",
		"filter/65": "Special Interest",
		"filter/66": "Sports",
		"filter/68": "Talk Show",
		"filter/69": "Thriller",
		"filter/70": "Travel",
		"filter/71": "TV Show/Series",
		"filter/72": "Variety",
		"filter/73": "Wellness",
		"filter/74": "Western",
		"filter/75": "Series",
		"filter/76": "Medical",
		"filter/77": "Further Learning",
		"filter/78": "Shopping",
		"filter/79": "Handicraft",
		"filter/80": "Living & Space",
		"filter/81": "Folks",
		"filter/82": "Jazz",
		"filter/83": "Special Event",
		"filter/84": "Weather Report",
		"filter/85": "Aquatics",
		"filter/86": "Home",
		"filter/87": "Magazine",
		"filter/88": "Athletics",
		"filter/89": "Cricket",
		"filter/90": "Martial Arts",
		"filter/91": "Tennis",
		"filter/92": "Winter Sports",
		"filter/93": "Wrestling",
		"filter/94": "Hockey",
		"filter/95": "Classic",
		"filter/96": "eSports",
		"filter/97": "Reality",
		"filter/100": "Others (Children)",
		"filter/101": "Others (Documentary)",
		"filter/102": "Others (Educational)",
		"filter/103": "Others (Lifestyle)",
		"filter/104": "Others (Film)",
		"filter/105": "Others (Music)",
		"filter/106": "Others (News)",
		"filter/107": "Others (Sports)",
		"filter/108": "Others (TV Shows)"
	}
} */
