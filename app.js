const weatherGrid = document.querySelector("#weatherGrid");
const weatherStatus = document.querySelector("#weatherStatus");
const currentTemp = document.querySelector("#currentTemp");
const currentRain = document.querySelector("#currentRain");
const currentHumidity = document.querySelector("#currentHumidity");
const tripModeStatus = document.querySelector("#tripModeStatus");
const nextStopLabel = document.querySelector("#nextStopLabel");
const nextStopName = document.querySelector("#nextStopName");
const nextStopTime = document.querySelector("#nextStopTime");
const nextStopEta = document.querySelector("#nextStopEta");
const nextStopNav = document.querySelector("#nextStopNav");
const delayOptions = document.querySelectorAll(".delay-option");
const countdownNodes = {
  days: document.querySelector("#daysLeft"),
  hours: document.querySelector("#hoursLeft"),
  minutes: document.querySelector("#minutesLeft"),
  seconds: document.querySelector("#secondsLeft")
};

const tripStops = [
  {
    name: "集合出發",
    label: "第一步",
    scheduledLabel: "原訂 08:00",
    etaLabel: "集合",
    start: "2026-09-22T08:00:00+08:00",
    end: "2026-09-22T08:30:00+08:00",
    nav: "https://maps.google.com/?q=童綜合醫療社團法人童綜合醫院沙鹿院區"
  },
  {
    name: "古坑綠色隧道",
    label: "下一站",
    scheduledLabel: "原訂 09:30",
    etaLabel: "抵達，綠意步道漫步",
    start: "2026-09-22T08:30:00+08:00",
    arrival: "2026-09-22T09:30:00+08:00",
    end: "2026-09-22T10:40:00+08:00",
    nav: "https://maps.google.com/?q=古坑綠色隧道"
  },
  {
    name: "桂林映象會館",
    label: "下一站",
    scheduledLabel: "原訂 11:00",
    etaLabel: "午餐",
    start: "2026-09-22T10:40:00+08:00",
    arrival: "2026-09-22T11:00:00+08:00",
    end: "2026-09-22T13:30:00+08:00",
    nav: "https://maps.google.com/?q=桂林映象會館"
  },
  {
    name: "塔吉特千層蛋糕大使館",
    label: "下一站",
    scheduledLabel: "原訂 14:00",
    etaLabel: "甜點 DIY / 下午茶",
    start: "2026-09-22T13:30:00+08:00",
    arrival: "2026-09-22T14:00:00+08:00",
    end: "2026-09-22T16:00:00+08:00",
    nav: "https://maps.google.com/?q=塔吉特千層蛋糕大使館"
  },
  {
    name: "啟程返家",
    label: "下一步",
    scheduledLabel: "原訂 16:00",
    etaLabel: "出發，約 17:15 返抵沙鹿",
    start: "2026-09-22T16:00:00+08:00",
    arrival: "2026-09-22T16:00:00+08:00",
    end: "2026-09-22T17:15:00+08:00",
    nav: "https://maps.google.com/?q=沙鹿"
  }
];

let tripDelayMinutes = Number(localStorage.getItem("yunlinTripDelayMinutes") || 0);

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
  const current = data?.current;

  if (!daily?.time?.length) {
    throw new Error("weather data unavailable");
  }

  const todayRain = daily.precipitation_probability_max?.[0];
  currentTemp.textContent = `${Math.round(current?.temperature_2m ?? daily.temperature_2m_max[0])}°C`;
  currentRain.textContent = `${todayRain ?? "--"}%`;
  currentHumidity.textContent = `${Math.round(current?.relative_humidity_2m ?? 0) || "--"}%`;

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
        <span class="weather-card__rain">降雨 ${rain ?? "--"}%</span>
      </article>
    `;
  }).join("");

  weatherStatus.textContent = `${formatWeatherDate(daily.time[0])} 即時參考`;
}

async function loadWeather() {
  const cacheBust = Date.now();
  const url = [
    "https://api.open-meteo.com/v1/forecast",
    "?latitude=23.659291",
    "&longitude=120.54098",
    "&current=temperature_2m,relative_humidity_2m,weather_code",
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
    currentTemp.textContent = "--°C";
    currentRain.textContent = "--%";
    currentHumidity.textContent = "--%";
    weatherGrid.innerHTML = `
      <a class="weather-card weather-card--loading" href="https://www.cwa.gov.tw/V8/C/W/County/County.html?CID=10009" target="_blank" rel="noopener">
        天氣資料暫時無法載入，請點此查看中央氣象署雲林縣預報。
      </a>
    `;
  }
}

function setupGatheringCountdown() {
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

function setupTripMode() {
  const delayMs = () => tripDelayMinutes * 60 * 1000;

  function getDelayedDate(value) {
    return new Date(new Date(value).getTime() + delayMs());
  }

  function formatTime(date) {
    return new Intl.DateTimeFormat("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date);
  }

  function getEtaText(stop) {
    const baseTime = stop.arrival || stop.start;
    const etaTime = formatTime(getDelayedDate(baseTime));
    return `預計 ${etaTime} ${stop.etaLabel}`;
  }

  function updateDelayButtons() {
    delayOptions.forEach((button) => {
      const selected = Number(button.dataset.delay) === tripDelayMinutes;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function renderTripMode() {
    const now = new Date();
    const tripStart = getDelayedDate(tripStops[0].start);
    const tripEnd = getDelayedDate(tripStops[tripStops.length - 1].end);
    let activeStop = tripStops[0];
    let status = "行程準備中";

    if (now < tripStart) {
      activeStop = tripStops[0];
      status = "尚未出發";
    } else if (now > tripEnd) {
      activeStop = tripStops[tripStops.length - 1];
      status = "行程已完成";
      activeStop = {
        ...activeStop,
        label: "今日完成",
        scheduledLabel: "行程完成",
        etaLabel: "已返程，記得帶齊伴手禮"
      };
    } else {
      activeStop = tripStops.find((stop) => now < getDelayedDate(stop.end)) || tripStops[tripStops.length - 1];
      status = "旅途中";
    }

    tripModeStatus.textContent = tripDelayMinutes > 0 ? `${status}，延誤 +${tripDelayMinutes} 分` : status;
    nextStopLabel.textContent = activeStop.label;
    nextStopName.textContent = activeStop.name;
    nextStopTime.textContent = activeStop.scheduledLabel;
    nextStopEta.textContent = activeStop.scheduledLabel === "行程完成" ? activeStop.etaLabel : getEtaText(activeStop);
    nextStopNav.href = activeStop.nav;
    nextStopNav.textContent = activeStop.name === "啟程返家" ? "開始導航" : "導航前往";
  }

  delayOptions.forEach((button) => {
    button.addEventListener("click", () => {
      tripDelayMinutes = Number(button.dataset.delay);
      localStorage.setItem("yunlinTripDelayMinutes", String(tripDelayMinutes));
      updateDelayButtons();
      renderTripMode();
    });
  });

  updateDelayButtons();
  renderTripMode();
  setInterval(renderTripMode, 60000);
}

setupGatheringCountdown();
setupTripMode();
loadWeather();
