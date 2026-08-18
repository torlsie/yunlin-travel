const weatherGrid = document.querySelector("#weatherGrid");
const weatherStatus = document.querySelector("#weatherStatus");
const countdownNodes = {
  days: document.querySelector("#daysLeft"),
  hours: document.querySelector("#hoursLeft"),
  minutes: document.querySelector("#minutesLeft"),
  seconds: document.querySelector("#secondsLeft")
};

const weatherLabels = new Map([
  [0, "晴朗"],
  [1, "大致晴朗"],
  [2, "局部多雲"],
  [3, "陰天"],
  [45, "霧"],
  [48, "霧淞"],
  [51, "小毛毛雨"],
  [53, "毛毛雨"],
  [55, "較強毛毛雨"],
  [61, "小雨"],
  [63, "中雨"],
  [65, "大雨"],
  [66, "凍雨"],
  [67, "強凍雨"],
  [71, "小雪"],
  [73, "中雪"],
  [75, "大雪"],
  [80, "短暫小雨"],
  [81, "短暫陣雨"],
  [82, "強陣雨"],
  [95, "雷雨"],
  [96, "雷雨夾冰雹"],
  [99, "強雷雨夾冰雹"]
]);

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatWeatherDate(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${value}T00:00:00+08:00`));
}

async function fetchJsonWithTimeout(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`request failed: ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function renderWeather(data) {
  const daily = data?.daily;

  if (!daily?.time?.length) {
    throw new Error("weather data unavailable");
  }

  weatherGrid.innerHTML = daily.time.slice(0, 3).map((date, index) => {
    const max = Math.round(daily.temperature_2m_max[index]);
    const min = Math.round(daily.temperature_2m_min[index]);
    const code = daily.weather_code[index];
    const rain = daily.precipitation_probability_max[index];
    const desc = weatherLabels.get(code) || "天氣資料";

    return `
      <article class="weather-card">
        <span class="weather-card__date">${formatWeatherDate(date)}</span>
        <strong class="weather-card__main">${min}-${max}°C</strong>
        <span class="weather-card__desc">${desc}</span>
        <span class="weather-card__rain">最高降雨機率 ${rain ?? "--"}%</span>
      </article>
    `;
  }).join("");

  const first = daily.time[0];
  const last = daily.time[Math.min(daily.time.length, 3) - 1];
  weatherStatus.textContent = `${formatWeatherDate(first)} - ${formatWeatherDate(last)} 已更新`;
}

async function loadWeather() {
  const cacheBust = Date.now();
  const url = [
    "https://api.open-meteo.com/v1/forecast",
    "?latitude=23.659291",
    "&longitude=120.54098",
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    "&timezone=Asia%2FTaipei",
    "&forecast_days=3",
    `&_=${cacheBust}`
  ].join("");

  try {
    const data = await fetchJsonWithTimeout(url);
    renderWeather(data);
  } catch (error) {
    console.warn("weather failed", error);
    weatherStatus.textContent = "暫時無法讀取";
    weatherGrid.innerHTML = `
      <a class="weather-card weather-card--loading" href="https://www.cwa.gov.tw/V8/C/W/County/County.html?CID=10009" target="_blank" rel="noopener">
        天氣資料暫時無法載入，請點此查看中央氣象署雲林縣預報。
      </a>
    `;
  }
}

function setupCountdown() {
  const target = new Date("2026-09-22T08:00:00+08:00").getTime();

  function renderCountdown() {
    const diff = target - Date.now();

    if (diff <= 0) {
      countdownNodes.days.textContent = "00";
      countdownNodes.hours.textContent = "00";
      countdownNodes.minutes.textContent = "00";
      countdownNodes.seconds.textContent = "00";
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdownNodes.days.textContent = String(days);
    countdownNodes.hours.textContent = pad(hours);
    countdownNodes.minutes.textContent = pad(minutes);
    countdownNodes.seconds.textContent = pad(seconds);
  }

  renderCountdown();
  setInterval(renderCountdown, 1000);
}

setupCountdown();
loadWeather();
