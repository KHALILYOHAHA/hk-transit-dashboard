/**
 * HK Transit + Weather Dashboard
 * Pure static — HKO weather + KMB/CTB bus ETAs + MTR Next Train + TD traffic detectors
 * (official open data).
 */
(function () {
  'use strict';

  const CFG = window.HK_DASH_CONFIG || {
    stops: [],
    mtr: [],
    traffic: [],
    transit: [],
    refreshSeconds: 60,
  };
  const REFRESH_MS = Math.max(15, Number(CFG.refreshSeconds) || 60) * 1000;
  const KMB_BASE = 'https://data.etabus.gov.hk/v1/transport/kmb';
  const CTB_BASE = 'https://rt.data.gov.hk/v2/transport/citybus';
  const MTR_BASE = 'https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php';
  /** 運輸署主要幹道交通偵測器 Raw 車速（約每 1 分鐘） */
  const TRAFFIC_RAW =
    'https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml';
  const HKO_RHR = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc';
  const HKO_FLW = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=flw&lang=tc';
  const HKO_FND = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=tc';
  const OPEN_METEO =
    'https://api.open-meteo.com/v1/forecast?latitude=22.3193&longitude=114.1694' +
    '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    '&forecast_days=8&timezone=Asia%2FHong_Kong';

  /** HKO weather icon → emoji + short label (常見編號) */
  const HKO_ICON_MAP = {
    50: { emoji: '☀️', label: '陽光充沛' },
    51: { emoji: '🌤️', label: '間有陽光' },
    52: { emoji: '⛅', label: '短暫陽光' },
    53: { emoji: '🌥️', label: '間中有陽光有驟雨' },
    54: { emoji: '🌦️', label: '短暫陽光有驟雨' },
    60: { emoji: '☁️', label: '多雲' },
    61: { emoji: '☁️', label: '密雲' },
    62: { emoji: '🌫️', label: '微雨' },
    63: { emoji: '🌧️', label: '雨' },
    64: { emoji: '🌧️', label: '大雨' },
    65: { emoji: '⛈️', label: '雷暴' },
    70: { emoji: '🌙', label: '天色良好' },
    71: { emoji: '🌙', label: '天色良好' },
    72: { emoji: '🌙', label: '天色良好' },
    73: { emoji: '☁️', label: '天色良好' },
    74: { emoji: '🌫️', label: '煙霞' },
    75: { emoji: '🌫️', label: '霧' },
    76: { emoji: '🌫️', label: '薄霧' },
    77: { emoji: '🥵', label: '酷熱' },
    80: { emoji: '💨', label: '大風' },
    81: { emoji: '🌀', label: '乾燥' },
    82: { emoji: '💧', label: '潮濕' },
    83: { emoji: '🌫️', label: '霧' },
    84: { emoji: '🌫️', label: '薄霧' },
    85: { emoji: '🥵', label: '炎熱' },
    90: { emoji: '🌡️', label: '寒冷' },
    91: { emoji: '❄️', label: '寒冷' },
    92: { emoji: '❄️', label: '寒冷' },
    93: { emoji: '❄️', label: '霜' },
  };

  const WMO_MAP = {
    0: { emoji: '☀️', label: '晴朗' },
    1: { emoji: '🌤️', label: '大致晴朗' },
    2: { emoji: '⛅', label: '部分多雲' },
    3: { emoji: '☁️', label: '陰天' },
    45: { emoji: '🌫️', label: '霧' },
    48: { emoji: '🌫️', label: '霧' },
    51: { emoji: '🌦️', label: '微毛毛雨' },
    61: { emoji: '🌧️', label: '小雨' },
    63: { emoji: '🌧️', label: '中雨' },
    65: { emoji: '🌧️', label: '大雨' },
    80: { emoji: '🌦️', label: '驟雨' },
    95: { emoji: '⛈️', label: '雷暴' },
  };

  /** 港鐵線碼 → 顯示名 */
  const MTR_LINE_TC = {
    AEL: '機場快線',
    TCL: '東涌線',
    TML: '屯馬線',
    TKL: '將軍澳線',
    EAL: '東鐵線',
    SIL: '南港島線',
    TWL: '荃灣線',
    ISL: '港島線',
    KTL: '觀塘線',
    DRL: '迪士尼線',
  };

  /** 站碼 → 中文（API dest 多數只回傳代碼；lang=TC 亦如是） */
  const MTR_STA_TC = {
    HOK: '香港', KOW: '九龍', TSY: '青衣', AIR: '機場', AWE: '博覽館',
    OLY: '奧運', NAC: '南昌', LAK: '荔景', SUN: '欣澳', TUC: '東涌',
    WKS: '烏溪沙', MOS: '馬鞍山', HEO: '恆安', TSH: '大水坑', SHM: '石門',
    CIO: '第一城', STW: '沙田圍', CKT: '車公廟', TAW: '大圍', HIK: '顯徑',
    DIH: '鑽石山', KAT: '啟德', SUW: '宋皇臺', TKW: '土瓜灣', HOM: '何文田',
    HUH: '紅磡', ETS: '尖東', AUS: '柯士甸', MEF: '美孚', TWW: '荃灣西',
    KSR: '錦上路', YUL: '元朗', LOP: '朗屏', TIS: '天水圍', SIH: '兆康',
    TUM: '屯門', NOP: '北角', QUB: '鰂魚涌', YAT: '油塘', TIK: '調景嶺',
    TKO: '將軍澳', LHP: '康城', HAH: '坑口', POA: '寶琳',
    ADM: '金鐘', EXC: '會展', MKK: '旺角東', KOT: '九龍塘', SHT: '沙田',
    FOT: '火炭', RAC: '馬場', UNI: '大學', TAP: '大埔墟', TWO: '太和',
    FAN: '粉嶺', SHS: '上水', LOW: '羅湖', LMC: '落馬洲',
    OCP: '海洋公園', WCH: '黃竹坑', LET: '利東', SOH: '海怡半島',
    CEN: '中環', TST: '尖沙咀', JOR: '佐敦', YMT: '油麻地', MOK: '旺角',
    PRE: '太子', SSP: '深水埗', CSW: '長沙灣', LCK: '荔枝角',
    KWF: '葵芳', KWH: '葵興', TWH: '大窩口', TSW: '荃灣',
    KET: '堅尼地城', HKU: '香港大學', SYP: '西營盤', SHW: '上環',
    WAC: '灣仔', CAB: '銅鑼灣', TIH: '天后', FOH: '炮台山',
    TAK: '太古', SWH: '西灣河', SKW: '筲箕灣', HFC: '杏花邨', CHW: '柴灣',
    WHA: '黃埔', SKM: '石硤尾', LOF: '樂富', WTS: '黃大仙', CHH: '彩虹',
    KOB: '九龍灣', NTK: '牛頭角', KWT: '觀塘', LAT: '藍田', DIS: '迪士尼',
  };

  const el = {
    weather: document.getElementById('weather'),
    wxIcon: document.getElementById('wx-icon'),
    wxTemp: document.getElementById('wx-temp'),
    wxCond: document.getElementById('wx-cond'),
    wxDetails: document.getElementById('wx-details'),
    wxTips: document.getElementById('wx-tips'),
    wxForecast: document.getElementById('wx-forecast'),
    etaList: document.getElementById('eta-list'),
    trafficList: document.getElementById('traffic-list'),
    lastUpdated: document.getElementById('last-updated'),
    countdown: document.getElementById('countdown'),
    searchForm: document.getElementById('bus-search-form'),
    searchInput: document.getElementById('bus-search-input'),
    searchBtn: document.getElementById('bus-search-btn'),
    searchStatus: document.getElementById('bus-search-status'),
    searchCompanies: document.getElementById('bus-search-companies'),
    searchDirs: document.getElementById('bus-search-dirs'),
    searchStops: document.getElementById('bus-search-stops'),
    searchEta: document.getElementById('bus-search-eta'),
  };

  let nextRefreshAt = 0;
  let tickTimer = null;

  /**
   * Prefer transit[] (ordered ETA row). Fall back to legacy stops[] + mtr[]
   * if transit is missing/empty.
   */
  function resolveTransitList() {
    if (Array.isArray(CFG.transit) && CFG.transit.length) {
      return CFG.transit.map((item) => {
        const type = String(item.type || item.company || '').toLowerCase();
        if (type === 'kmb' || type === 'ctb' || type === 'mtr' || type === 'placeholder') {
          return { ...item, type };
        }
        // Infer from fields
        if (item.line && item.station) return { ...item, type: 'mtr' };
        if (item.company === 'ctb' || item.company === 'CTB') return { ...item, type: 'ctb' };
        if (item.stopId || item.route) return { ...item, type: 'kmb', company: 'kmb' };
        return { ...item, type: 'placeholder' };
      });
    }
    const out = [];
    (CFG.stops || []).forEach((s) => {
      const company = String(s.company || 'kmb').toLowerCase();
      out.push({ ...s, type: company === 'ctb' ? 'ctb' : 'kmb', company });
    });
    (CFG.mtr || []).forEach((s) => out.push({ ...s, type: 'mtr' }));
    return out;
  }

  function formatHkTime(d) {
    const parts = new Intl.DateTimeFormat('zh-HK', {
      timeZone: 'Asia/Hong_Kong',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(d instanceof Date ? d : new Date(d));
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    return `${get('hour')}:${get('minute')}:${get('second')}`;
  }

  function formatClock(iso) {
    if (!iso) return '—';
    // MTR returns "yyyy-MM-dd HH:mm:ss" (HK local, no TZ suffix)
    const normalized =
      typeof iso === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(iso)
        ? iso.replace(' ', 'T') + '+08:00'
        : iso;
    const parts = new Intl.DateTimeFormat('zh-HK', {
      timeZone: 'Asia/Hong_Kong',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(normalized));
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    return `${get('hour')}:${get('minute')}`;
  }

  function minutesUntil(iso) {
    if (!iso) return null;
    const normalized =
      typeof iso === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(iso)
        ? iso.replace(' ', 'T') + '+08:00'
        : iso;
    const ms = new Date(normalized).getTime() - Date.now();
    return Math.round(ms / 60000);
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.json();
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
    return res.text();
  }

  async function loadWeather() {
    const provider = (CFG.weatherProvider || 'hko').toLowerCase();
    if (provider === 'open-meteo') {
      try {
        return await loadOpenMeteo();
      } catch (e) {
        console.warn('Open-Meteo failed, try HKO', e);
        return loadHko();
      }
    }
    try {
      return await loadHko();
    } catch (e) {
      console.warn('HKO failed, try Open-Meteo', e);
      return loadOpenMeteo();
    }
  }

  function hkTodayYmd() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Hong_Kong',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  function formatWeekLabel(week, isoDate) {
    const raw = String(week || '').trim();
    if (/^星期/.test(raw)) return raw.replace(/^星期/, '週');
    if (raw) return raw;
    if (!isoDate) return '';
    try {
      return new Intl.DateTimeFormat('zh-HK', {
        timeZone: 'Asia/Hong_Kong',
        weekday: 'short',
      }).format(new Date(`${isoDate}T12:00:00+08:00`));
    } catch (_) {
      return '';
    }
  }

  function ymdToIso(ymd) {
    const s = String(ymd || '');
    if (s.length === 8) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    return s;
  }

  function dateLabelFromIso(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return '';
    return `${Number(m[3])}/${Number(m[2])}`;
  }

  /** HKO 9-day forecast (dataType=fnd) → first 7 days. PSR = 顯著降雨概率（低／中／高等）。 */
  function daysFromHkoFnd(fnd) {
    const rows = Array.isArray(fnd?.weatherForecast) ? fnd.weatherForecast : [];
    return rows.slice(0, 7).map((row) => {
      const icon = row.ForecastIcon ?? row.forecastIcon;
      const mapped = HKO_ICON_MAP[icon] || { emoji: '🌡️', label: '天氣' };
      const iso = ymdToIso(row.forecastDate);
      const psr = row.PSR != null && String(row.PSR).trim() ? String(row.PSR).trim() : '';
      return {
        week: formatWeekLabel(row.week, iso),
        dateLabel: dateLabelFromIso(iso),
        emoji: mapped.emoji,
        condition: row.forecastWeather || mapped.label,
        high: row.forecastMaxtemp?.value,
        low: row.forecastMintemp?.value,
        rainChance: psr ? `降雨 ${psr}` : null,
      };
    });
  }

  /** Open-Meteo daily; skip today so it matches HKO「未來」7 天. */
  function daysFromOpenMeteo(data) {
    const d = data?.daily || {};
    const dates = Array.isArray(d.time) ? d.time : [];
    const today = hkTodayYmd();
    const out = [];
    for (let i = 0; i < dates.length && out.length < 7; i++) {
      const iso = dates[i];
      if (!iso || iso === today) continue;
      const code = d.weather_code?.[i];
      const mapped = WMO_MAP[code] || { emoji: '🌡️', label: `代碼 ${code}` };
      const pop = d.precipitation_probability_max?.[i];
      const high = d.temperature_2m_max?.[i];
      const low = d.temperature_2m_min?.[i];
      out.push({
        week: formatWeekLabel('', iso),
        dateLabel: dateLabelFromIso(iso),
        emoji: mapped.emoji,
        condition: mapped.label,
        high: high != null && Number.isFinite(Number(high)) ? Math.round(Number(high)) : null,
        low: low != null && Number.isFinite(Number(low)) ? Math.round(Number(low)) : null,
        rainChance: pop != null && pop !== '' ? `降雨 ${Math.round(Number(pop))}%` : null,
      });
    }
    return out;
  }

  async function loadOpenMeteoForecastDays() {
    const data = await fetchJson(OPEN_METEO);
    return daysFromOpenMeteo(data);
  }

  async function loadHko() {
    const [rhr, flw, fnd] = await Promise.all([
      fetchJson(HKO_RHR),
      fetchJson(HKO_FLW).catch(() => null),
      fetchJson(HKO_FND).catch(() => null),
    ]);
    const temps = rhr.temperature?.data || [];
    const hko = temps.find((t) => t.place === '香港天文台') || temps[0];
    const humidity = rhr.humidity?.data?.[0]?.value;
    const iconCode = Array.isArray(rhr.icon) ? rhr.icon[0] : rhr.icon;
    const mapped = HKO_ICON_MAP[iconCode] || { emoji: '🌡️', label: '天氣' };
    const forecast = flw?.forecastDesc || flw?.generalSituation || '';
    const uv = rhr.uvindex?.data?.[0];
    const rainRows = Array.isArray(rhr.rainfall?.data) ? rhr.rainfall.data : [];
    const rainfallMax = rainRows.reduce((m, row) => {
      const v = Number(row?.max);
      return Number.isFinite(v) ? Math.max(m, v) : m;
    }, 0);
    const wx = {
      temp: hko?.value,
      unit: hko?.unit || 'C',
      humidity,
      iconCode,
      uvValue: uv != null ? uv.value : null,
      uvDesc: uv?.desc || '',
      rainfallMax,
      wxLabel: mapped.label,
      emoji: mapped.emoji,
      condition: forecast ? forecast.split(/[。．]/)[0] : mapped.label,
      details: [
        humidity != null ? `濕度 ${humidity}%` : null,
        uv ? `紫外線 ${uv.value}（${uv.desc}）` : null,
        `觀測：${hko?.place || '香港'}`,
      ].filter(Boolean),
      source: 'HKO',
      forecastSource: 'HKO',
      forecastDays: daysFromHkoFnd(fnd),
    };
    if (!wx.forecastDays.length) {
      try {
        wx.forecastDays = await loadOpenMeteoForecastDays();
        if (wx.forecastDays.length) wx.forecastSource = 'Open-Meteo';
      } catch (e) {
        console.warn('HKO 7-day forecast missing, Open-Meteo fallback failed', e);
      }
    }
    return wx;
  }

  async function loadOpenMeteo() {
    const data = await fetchJson(OPEN_METEO);
    const c = data.current || {};
    const mapped = WMO_MAP[c.weather_code] || { emoji: '🌡️', label: `代碼 ${c.weather_code}` };
    const forecastDays = daysFromOpenMeteo(data);
    return {
      temp: Math.round(c.temperature_2m),
      unit: 'C',
      humidity: c.relative_humidity_2m,
      iconCode: c.weather_code,
      uvValue: null,
      uvDesc: '',
      rainfallMax: null,
      wxLabel: mapped.label,
      emoji: mapped.emoji,
      condition: mapped.label,
      details: [
        c.relative_humidity_2m != null ? `濕度 ${c.relative_humidity_2m}%` : null,
        c.wind_speed_10m != null ? `風速 ${c.wind_speed_10m} km/h` : null,
        'Open-Meteo',
      ].filter(Boolean),
      source: 'Open-Meteo',
      forecastSource: forecastDays.length ? 'Open-Meteo' : '',
      forecastDays,
    };
  }

  /**
   * 根據已載入嘅天文台／Open-Meteo 數據產生 1–3 條短提示（唔另拉 API）。
   *  - 雨／驟雨／雷暴／有錄得雨量，或 HKO 圖示 53/54/62–65、WMO 雨碼 → 拎遮
   *  - 明顯落雨（圖示 63–65、字眼含大雨／雷暴、或雨量 ≥1 mm）→ 小心路滑
   *  - 氣溫 ≤18°C，或寒冷圖示／字眼 → 著多件衫
   *  - 氣溫 ≥30°C、酷熱／炎熱、或乾燥偏熱（濕度 ≤40% 且 ≥28°C）→ 飲多啲水
   *  - 紫外線指數 ≥6 或描述為高／甚高／極高 → 塗防曬；同時 ≥28°C 亦會 飲多啲水
   *  - 以上皆非 → 天氣清爽，適合輕裝
   */
  function weatherTipsFrom(wx) {
    const tips = [];
    const temp = Number(wx.temp);
    const hasTemp = Number.isFinite(temp);
    const humidity = Number(wx.humidity);
    const uvVal = wx.uvValue != null && wx.uvValue !== '' ? Number(wx.uvValue) : NaN;
    const uvDesc = String(wx.uvDesc || '').trim();
    const icon = wx.iconCode != null && wx.iconCode !== '' ? Number(wx.iconCode) : NaN;
    const label = String(wx.wxLabel || '');
    const cond = String(wx.condition || '');
    const blob = `${cond} ${label}`;
    const rainfall = wx.rainfallMax != null ? Number(wx.rainfallMax) : NaN;

    const hkoRainIcons = new Set([53, 54, 62, 63, 64, 65]);
    const wmoRainCodes = new Set([51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
    const rainByIcon =
      Number.isFinite(icon) &&
      (wx.source === 'Open-Meteo' ? wmoRainCodes.has(icon) : hkoRainIcons.has(icon));
    const rainByText = /驟雨|雷暴|雷雨|大雨|微雨|毛毛雨|雨/.test(blob);
    const raining = rainByIcon || rainByText || (Number.isFinite(rainfall) && rainfall > 0);
    const clearlyRaining =
      (Number.isFinite(icon) && (wx.source === 'Open-Meteo' ? [63, 65, 82, 95, 96, 99].includes(icon) : [63, 64, 65].includes(icon))) ||
      /大雨|雷暴|雷雨/.test(blob) ||
      (Number.isFinite(rainfall) && rainfall >= 1);

    const cold =
      (hasTemp && temp <= 18) ||
      (Number.isFinite(icon) && wx.source !== 'Open-Meteo' && [90, 91, 92, 93].includes(icon)) ||
      /寒冷|嚴寒|霜/.test(blob);
    const hot =
      (hasTemp && temp >= 30) ||
      (Number.isFinite(icon) && wx.source !== 'Open-Meteo' && [77, 85].includes(icon)) ||
      /酷熱|炎熱/.test(blob);
    const dryHeat = hasTemp && temp >= 28 && Number.isFinite(humidity) && humidity <= 40;
    const highUv =
      (Number.isFinite(uvVal) && uvVal >= 6) || /^(高|甚高|極高)/.test(uvDesc);
    const drinkWater = hot || dryHeat || (highUv && hasTemp && temp >= 28);

    if (raining) tips.push('拎遮');
    if (clearlyRaining) tips.push('小心路滑');
    if (cold) tips.push('著多件衫');
    if (drinkWater) tips.push('飲多啲水');
    if (highUv && !clearlyRaining) tips.push('塗防曬');
    if (!tips.length) tips.push('天氣清爽，適合輕裝');
    return tips.slice(0, 3);
  }

  function renderWeatherTips(tips) {
    if (!el.wxTips) return;
    if (!tips || !tips.length) {
      el.wxTips.hidden = true;
      el.wxTips.innerHTML = '';
      return;
    }
    el.wxTips.hidden = false;
    el.wxTips.innerHTML = tips
      .map((tip) => `<span class="weather-tip">${escapeHtml(tip)}</span>`)
      .join('');
  }

  function renderForecast(days, source) {
    if (!el.wxForecast) return;
    if (!days || !days.length) {
      el.wxForecast.hidden = true;
      el.wxForecast.innerHTML = '';
      return;
    }
    const srcLabel = source === 'Open-Meteo' ? '未來 7 天 · Open-Meteo' : '未來 7 天 · 香港天文台';
    const cells = days
      .map((day) => {
        const high = day.high != null && day.high !== '' ? String(day.high) : '—';
        const low = day.low != null && day.low !== '' ? String(day.low) : '—';
        const rain = day.rainChance
          ? `<div class="wx-day-rain">${escapeHtml(day.rainChance)}</div>`
          : '';
        return `<div class="wx-day" title="${escapeHtml(day.condition || '')}">
          <div class="wx-day-week">${escapeHtml(day.week || '')}</div>
          <div class="wx-day-date">${escapeHtml(day.dateLabel || '')}</div>
          <div class="wx-day-icon">${escapeHtml(day.emoji || '')}</div>
          <div class="wx-day-hi">${escapeHtml(high)}°<span> / ${escapeHtml(low)}°</span></div>
          ${rain}
        </div>`;
      })
      .join('');
    el.wxForecast.hidden = false;
    el.wxForecast.innerHTML =
      `<div class="wx-forecast-source">${escapeHtml(srcLabel)}</div>` +
      `<div class="wx-forecast-row">${cells}</div>`;
  }

  function renderWeather(wx, err) {
    if (err) {
      el.wxIcon.textContent = '⚠️';
      el.wxTemp.innerHTML = '—';
      el.wxCond.textContent = '天氣載入失敗';
      el.wxDetails.innerHTML = `<span class="error-box" style="display:inline-block">${escapeHtml(String(err.message || err))}</span>`;
      renderWeatherTips([]);
      renderForecast([], '');
      return;
    }
    el.wxIcon.textContent = wx.emoji || '🌡️';
    el.wxTemp.innerHTML = `${wx.temp != null ? wx.temp : '—'}<span>°${wx.unit || 'C'}</span>`;
    el.wxCond.textContent = wx.condition || '';
    el.wxDetails.innerHTML = (wx.details || [])
      .map((d) => `<span>${escapeHtml(d)}</span>`)
      .join('');
    renderWeatherTips(weatherTipsFrom(wx));
    renderForecast(wx.forecastDays || [], wx.forecastSource || wx.source || '');
  }

  async function loadKmbEta(stopCfg) {
    const url = `${KMB_BASE}/eta/${encodeURIComponent(stopCfg.stopId)}/${encodeURIComponent(stopCfg.route)}/${encodeURIComponent(stopCfg.serviceType || 1)}`;
    const json = await fetchJson(url);
    let rows = Array.isArray(json.data) ? json.data : [];
    const bound = (stopCfg.bound || '').toUpperCase();
    if (bound === 'O' || bound === 'I') {
      rows = rows.filter((r) => (r.dir || '').toUpperCase() === bound);
    }
    rows = rows
      .filter((r) => r.eta)
      .sort((a, b) => (a.eta_seq || 0) - (b.eta_seq || 0) || String(a.eta).localeCompare(String(b.eta)))
      .slice(0, 3);

    let stopNameTc = stopCfg.stopNameTc;
    let stopNameEn = stopCfg.stopNameEn;
    if (!stopNameTc) {
      try {
        const s = await fetchJson(`${KMB_BASE}/stop/${encodeURIComponent(stopCfg.stopId)}`);
        stopNameTc = s.data?.name_tc;
        stopNameEn = s.data?.name_en;
      } catch (_) { /* ignore */ }
    }

    const destTc = rows[0]?.dest_tc || '';
    const destEn = rows[0]?.dest_en || '';

    return {
      ...stopCfg,
      company: 'kmb',
      stopNameTc,
      stopNameEn,
      destTc,
      destEn,
      etas: rows.map((r) => ({
        eta: r.eta,
        rmk_tc: r.rmk_tc || '',
        dest_tc: r.dest_tc,
      })),
    };
  }

  /**
   * Citybus ETA (prepared for middle slot).
   * API: /v2/transport/citybus/eta/CTB/{stopId}/{route}
   * Optional dir filter: stopCfg.bound 'O'|'I' maps to API dir outbound/inbound
   *   (CTB uses dir "O"/"I" in eta payload similarly).
   */
  async function loadCtbEta(stopCfg) {
    const stopId = stopCfg.stopId;
    const route = stopCfg.route;
    if (!stopId || !route) throw new Error('CTB config 缺少 stopId 或 route');
    const url = `${CTB_BASE}/eta/CTB/${encodeURIComponent(stopId)}/${encodeURIComponent(route)}`;
    const json = await fetchJson(url);
    let rows = Array.isArray(json.data) ? json.data : [];
    const bound = (stopCfg.bound || stopCfg.dir || '').toUpperCase();
    if (bound === 'O' || bound === 'I') {
      rows = rows.filter((r) => (r.dir || '').toUpperCase() === bound);
    }
    rows = rows
      .filter((r) => r.eta)
      .sort((a, b) => (a.eta_seq || 0) - (b.eta_seq || 0) || String(a.eta).localeCompare(String(b.eta)))
      .slice(0, 3);

    let stopNameTc = stopCfg.stopNameTc;
    let stopNameEn = stopCfg.stopNameEn;
    if (!stopNameTc) {
      try {
        const s = await fetchJson(`${CTB_BASE}/stop/${encodeURIComponent(stopId)}`);
        stopNameTc = s.data?.name_tc;
        stopNameEn = s.data?.name_en;
      } catch (_) { /* ignore */ }
    }

    return {
      ...stopCfg,
      company: 'ctb',
      stopNameTc,
      stopNameEn,
      destTc: rows[0]?.dest_tc || '',
      destEn: rows[0]?.dest_en || '',
      etas: rows.map((r) => ({
        eta: r.eta,
        rmk_tc: r.rmk_tc || '',
        dest_tc: r.dest_tc,
      })),
    };
  }

  async function loadBusEta(stopCfg) {
    const company = String(stopCfg.company || stopCfg.type || 'kmb').toLowerCase();
    if (company === 'ctb') return loadCtbEta(stopCfg);
    if (company === 'kmb') return loadKmbEta(stopCfg);
    throw new Error(`未支援公司：${company}`);
  }

  function renderEtaChips(items) {
    if (!items.length) {
      return `<div class="empty-eta">暫時未有到站時間 · No ETA right now</div>`;
    }
    return `<div class="etas">${items
      .map((e) => {
        const mins = e.mins != null ? e.mins : minutesUntil(e.eta);
        let klass = '';
        let label;
        if (mins == null || Number.isNaN(mins)) {
          label = '—';
        } else if (mins <= 0) {
          label = '即將到';
          klass = 'due';
        } else if (mins <= 3) {
          label = `${mins}<span class="unit">分鐘</span>`;
          klass = 'soon';
        } else {
          label = `${mins}<span class="unit">分鐘</span>`;
        }
        const rmk = e.rmk ? `<div class="rmk">${escapeHtml(e.rmk)}</div>` : '';
        const plat = e.plat ? `<div class="mtr-plat">月台 ${escapeHtml(String(e.plat))}</div>` : '';
        return `<div class="eta-chip">
          <div class="mins ${klass}">${label}</div>
          <div class="clock">${escapeHtml(e.clock || formatClock(e.eta))}</div>
          ${plat}
          ${rmk}
        </div>`;
      })
      .join('')}</div>`;
  }

  function renderBusCard(data, err) {
    const card = document.createElement('section');
    const isCtb = String(data.company || data.type || '').toLowerCase() === 'ctb';
    card.className = 'card bus-card';
    if (err) {
      card.innerHTML = `
        <div class="top">
          <div class="route-badge ${isCtb ? 'ctb' : ''}">${escapeHtml(data.route || '?')}</div>
          <div class="route-meta">
            <div class="label">${escapeHtml(data.label || (isCtb ? 'CTB' : 'KMB'))}</div>
            <div class="dest">載入失敗</div>
            <div class="stop-name">${escapeHtml(data.stopNameTc || data.stopId || '')}</div>
          </div>
        </div>
        <div class="error-box">${escapeHtml(String(err.message || err))}</div>`;
      return card;
    }

    const dest = data.destTc
      ? `往 ${data.destTc}`
      : data.bound === 'O'
        ? '去程'
        : data.bound === 'I'
          ? '回程'
          : '';

    const chips = renderEtaChips(
      (data.etas || []).map((e) => ({
        eta: e.eta,
        rmk: e.rmk_tc || '',
      }))
    );

    card.innerHTML = `
      <div class="top">
        <div class="route-badge ${isCtb ? 'ctb' : ''}">${escapeHtml(data.route)}</div>
        <div class="route-meta">
          <div class="label">${escapeHtml(data.label || (isCtb ? '城巴 CTB' : 'KMB'))}</div>
          <div class="dest" title="${escapeHtml(data.destEn || '')}">${escapeHtml(dest)}</div>
          <div class="stop-name">${escapeHtml(data.stopNameTc || '')}${
            data.stopNameEn ? ` · <span style="opacity:.8">${escapeHtml(data.stopNameEn)}</span>` : ''
          }</div>
        </div>
      </div>
      ${chips}`;
    return card;
  }

  function renderPlaceholderCard(cfg) {
    const card = document.createElement('section');
    card.className = 'card placeholder-card';
    card.innerHTML = `
      <div class="top">
        <div class="placeholder-badge">待定</div>
        <div class="route-meta">
          <div class="label">占位</div>
          <div class="dest">${escapeHtml(cfg.label || '待確認')}</div>
          <div class="stop-name">未設定</div>
        </div>
      </div>
      <div class="placeholder-body">${escapeHtml(
        cfg.note || '請於 config.js 填入 stopId／route 後啟用'
      )}</div>`;
    return card;
  }

  function mtrStaName(code) {
    if (!code) return '';
    return MTR_STA_TC[code] || code;
  }

  function mtrLineName(code) {
    if (!code) return '港鐵';
    return MTR_LINE_TC[code] || code;
  }

  function normalizeMtrTrains(rows) {
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r) => r && (r.valid == null || String(r.valid).toUpperCase() === 'Y'))
      .map((r) => {
        const ttnt = r.ttnt != null && r.ttnt !== '' ? Number(r.ttnt) : null;
        return {
          dest: r.dest,
          destTc: mtrStaName(r.dest),
          plat: r.plat,
          time: r.time,
          mins: Number.isFinite(ttnt) ? ttnt : minutesUntil(r.time),
          seq: Number(r.seq) || 0,
        };
      })
      .sort((a, b) => a.seq - b.seq || (a.mins ?? 99) - (b.mins ?? 99))
      .slice(0, 4);
  }

  async function loadMtrEta(mtrCfg) {
    const line = String(mtrCfg.line || '').toUpperCase();
    const station = String(mtrCfg.station || '').toUpperCase();
    if (!line || !station) {
      throw new Error('config 缺少 line 或 station');
    }
    const url =
      `${MTR_BASE}?line=${encodeURIComponent(line)}` +
      `&sta=${encodeURIComponent(station)}&lang=TC`;
    const json = await fetchJson(url);

    // status 0 = special arrangement / suspension — show official message, no invented times
    if (json.status === 0 || json.status === '0') {
      return {
        ...mtrCfg,
        line,
        station,
        special: true,
        message: json.message || '特別列車服務安排',
        url: json.url || '',
        up: [],
        down: [],
      };
    }

    const key = `${line}-${station}`;
    const block = (json.data && (json.data[key] || Object.values(json.data)[0])) || {};
    const dir = String(mtrCfg.direction || 'BOTH').toUpperCase();
    const up = dir === 'DOWN' ? [] : normalizeMtrTrains(block.UP);
    const down = dir === 'UP' ? [] : normalizeMtrTrains(block.DOWN);

    return {
      ...mtrCfg,
      line,
      station,
      stationNameTc: mtrCfg.stationNameTc || mtrStaName(station),
      lineNameTc: mtrLineName(line),
      isdelay: json.isdelay === 'Y',
      up,
      down,
      special: false,
    };
  }

  function renderMtrDirBlock(title, trains) {
    if (!trains.length) {
      return `<div class="mtr-dir">
        <div class="mtr-dir-label">${escapeHtml(title)}</div>
        <div class="empty-eta">暫時未有班次</div>
      </div>`;
    }
    const chips = renderEtaChips(
      trains.map((t) => ({
        mins: t.mins,
        eta: t.time,
        clock: formatClock(t.time),
        plat: t.plat,
        rmk: t.destTc ? `往 ${t.destTc}` : t.dest ? `往 ${t.dest}` : '',
      }))
    );
    return `<div class="mtr-dir">
      <div class="mtr-dir-label">${escapeHtml(title)}</div>
      ${chips}
    </div>`;
  }

  function renderMtrCard(data, err) {
    const card = document.createElement('section');
    card.className = 'card mtr-card';
    const lineCode = data.line || '?';
    const lineLabel = data.lineNameTc || mtrLineName(lineCode);

    if (err) {
      card.innerHTML = `
        <div class="top">
          <div class="mtr-badge">${escapeHtml(lineCode)}</div>
          <div class="route-meta">
            <div class="label">${escapeHtml(data.label || 'MTR')}</div>
            <div class="dest">載入失敗</div>
            <div class="stop-name">${escapeHtml(data.stationNameTc || data.station || '')}</div>
          </div>
        </div>
        <div class="error-box">${escapeHtml(String(err.message || err))}</div>`;
      return card;
    }

    if (data.special) {
      const link = data.url
        ? `<div style="margin-top:8px;font-size:0.75rem"><a href="${escapeHtml(data.url)}" target="_blank" rel="noopener" style="color:var(--accent)">官方詳情</a></div>`
        : '';
      card.innerHTML = `
        <div class="top">
          <div class="mtr-badge">${escapeHtml(lineCode)}</div>
          <div class="route-meta">
            <div class="label">${escapeHtml(data.label || 'MTR')}</div>
            <div class="dest">${escapeHtml(lineLabel)}</div>
            <div class="stop-name">${escapeHtml(data.stationNameTc || mtrStaName(data.station) || data.station || '')}</div>
          </div>
        </div>
        <div class="error-box" style="color:var(--warn);border-color:rgba(245,197,66,.4);background:rgba(245,197,66,.1)">
          ${escapeHtml(data.message || '特別列車服務安排')}
          ${link}
        </div>`;
      return card;
    }

    const dir = String(data.direction || 'BOTH').toUpperCase();
    let body = '';
    if (dir === 'UP') {
      body = renderMtrDirBlock('上行 UP', data.up);
    } else if (dir === 'DOWN') {
      // Personal layout: DOWN only toward WKS — label clearly
      const destHint =
        data.down?.[0]?.destTc || data.down?.[0]?.dest
          ? `下行 · 往 ${data.down[0].destTc || data.down[0].dest}`
          : '下行 · 往烏溪沙';
      body = renderMtrDirBlock(destHint, data.down);
    } else {
      body =
        renderMtrDirBlock('上行 UP', data.up) +
        renderMtrDirBlock('下行 DOWN', data.down);
    }

    const delayNote = data.isdelay
      ? `<div class="rmk" style="margin-top:8px;color:var(--warn)">服務可能受阻 · isdelay</div>`
      : '';

    card.innerHTML = `
      <div class="top">
        <div class="mtr-badge">${escapeHtml(lineCode)}<br/><span style="font-weight:600;opacity:.9;font-size:0.65rem">${escapeHtml(lineLabel)}</span></div>
        <div class="route-meta">
          <div class="label">${escapeHtml(data.label || 'MTR')}</div>
          <div class="dest">${escapeHtml(data.stationNameTc || mtrStaName(data.station) || data.station)}</div>
          <div class="stop-name">${escapeHtml(lineLabel)} · ${escapeHtml(data.station || '')}</div>
        </div>
      </div>
      ${body}
      ${delayNote}`;
    return card;
  }

  async function loadTransitItem(item) {
    const type = String(item.type || '').toLowerCase();
    if (type === 'placeholder') {
      return renderPlaceholderCard(item);
    }
    if (type === 'mtr') {
      try {
        const data = await loadMtrEta(item);
        return renderMtrCard(data);
      } catch (err) {
        return renderMtrCard(item, err);
      }
    }
    if (type === 'kmb' || type === 'ctb') {
      try {
        const data = await loadBusEta({ ...item, company: type });
        return renderBusCard(data);
      } catch (err) {
        return renderBusCard({ ...item, company: type }, err);
      }
    }
    return renderPlaceholderCard({
      label: item.label || '未知類型',
      note: `未支援 type：${type || '?'}`,
    });
  }

  /** 顯示用車況（唔改 API 數字；只係 UI 顏色／標籤） */
  function trafficStatusFromSpeed(kmh) {
    if (kmh == null || Number.isNaN(kmh)) return { key: '', label: '未有數據', klass: '' };
    if (kmh >= 60) return { key: 'good', label: '暢通', klass: '' };
    if (kmh >= 40) return { key: 'slow', label: '緩慢', klass: 'slow' };
    return { key: 'jam', label: '擠塞', klass: 'jam' };
  }

  /**
   * 解析運輸署 rawSpeedVol XML → Map(detector_id → {speed, lanes, direction})
   * 只用 valid=Y 且 1–130 km/h 嘅車道（過高當異常，唔發明數字）。
   */
  function parseTrafficRawXml(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
    if (doc.querySelector('parsererror')) {
      throw new Error('交通 XML 解析失敗');
    }
    const root = doc.documentElement;
    const date = root.querySelector('date')?.textContent?.trim() || '';
    const periods = [...root.querySelectorAll('periods > period')];
    const period = periods[periods.length - 1];
    if (!period) throw new Error('交通 XML 未有 period');
    const periodFrom = period.querySelector('period_from')?.textContent?.trim() || '';
    const periodTo = period.querySelector('period_to')?.textContent?.trim() || '';
    const map = new Map();
    period.querySelectorAll('detectors > detector').forEach((det) => {
      const id = det.querySelector('detector_id')?.textContent?.trim();
      if (!id) return;
      const direction = det.querySelector('direction')?.textContent?.trim() || '';
      const speeds = [];
      det.querySelectorAll('lanes > lane').forEach((lane) => {
        const valid = (lane.querySelector('valid')?.textContent || 'Y').trim().toUpperCase();
        if (valid !== 'Y') return;
        const sp = Number(lane.querySelector('speed')?.textContent);
        if (!Number.isFinite(sp) || sp < 1 || sp > 130) return;
        speeds.push(sp);
      });
      if (!speeds.length) return;
      const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
      map.set(id, {
        speed: Math.round(avg * 10) / 10,
        lanes: speeds.length,
        direction,
      });
    });
    return { date, periodFrom, periodTo, map };
  }

  let trafficCache = null;
  let trafficCacheAt = 0;

  async function loadTrafficSnapshot() {
    const now = Date.now();
    // 同一輪 refresh 共用一次 XML（多個路段）
    if (trafficCache && now - trafficCacheAt < 10000) return trafficCache;
    const xml = await fetchText(TRAFFIC_RAW);
    trafficCache = parseTrafficRawXml(xml);
    trafficCacheAt = now;
    return trafficCache;
  }

  async function loadTrafficSegment(cfg) {
    const ids = (cfg.detectorIds || []).map((x) => String(x).trim()).filter(Boolean);
    if (!ids.length) throw new Error('config 缺少 detectorIds');
    const snap = await loadTrafficSnapshot();
    const found = [];
    ids.forEach((id) => {
      const row = snap.map.get(id);
      if (row) found.push({ id, ...row });
    });
    let avg = null;
    if (found.length) {
      avg = found.reduce((a, b) => a + b.speed, 0) / found.length;
      avg = Math.round(avg * 10) / 10;
    }
    return {
      ...cfg,
      avgSpeed: avg,
      samples: found,
      missingIds: ids.filter((id) => !snap.map.has(id)),
      captureDate: snap.date,
      periodFrom: snap.periodFrom,
      periodTo: snap.periodTo,
      source: 'TD traffic-detectors rawSpeedVol',
    };
  }

  function renderTrafficCard(data, err) {
    const card = document.createElement('section');
    card.className = 'card traffic-card';
    if (err) {
      card.innerHTML = `
        <div class="top">
          <div class="traffic-badge">道路</div>
          <div class="route-meta">
            <div class="label">${escapeHtml(data.label || '交通')}</div>
            <div class="dest">載入失敗</div>
            <div class="stop-name">${escapeHtml(data.roadNameTc || '')}</div>
          </div>
        </div>
        <div class="error-box">${escapeHtml(String(err.message || err))}</div>`;
      return card;
    }

    const st = trafficStatusFromSpeed(data.avgSpeed);
    const speedHtml =
      data.avgSpeed == null
        ? `<div class="empty-eta">暫時未有有效車速</div>`
        : `<div class="traffic-speed-row">
            <div class="traffic-speed-chip">
              <div class="speed ${st.klass}">${escapeHtml(String(data.avgSpeed))}<span class="unit">km/h</span></div>
              <div class="status">${escapeHtml(st.label)}</div>
              <div class="meta-line">${escapeHtml(
                data.periodFrom && data.periodTo
                  ? `${data.captureDate || ''} ${data.periodFrom}–${data.periodTo}`
                  : data.captureDate || ''
              )}</div>
            </div>
          </div>`;

    const detLine = data.samples?.length
      ? `<div class="traffic-detectors">偵測器 ${data.samples
          .map((s) => `${escapeHtml(s.id)} ${escapeHtml(String(s.speed))}km/h`)
          .join(' · ')}${
          data.missingIds?.length
            ? ` · 缺：${data.missingIds.map(escapeHtml).join(', ')}`
            : ''
        }</div>`
      : `<div class="traffic-detectors">未配對到有效偵測器</div>`;

    const note = data.note
      ? `<div class="stop-name" style="margin-top:6px">${escapeHtml(data.note)}</div>`
      : '';

    card.innerHTML = `
      <div class="top">
        <div class="traffic-badge">道路<br/><span style="font-weight:600;opacity:.9;font-size:0.65rem">TD</span></div>
        <div class="route-meta">
          <div class="label">${escapeHtml(data.label || '交通')}</div>
          <div class="dest">${escapeHtml(data.roadNameTc || '')}</div>
          <div class="stop-name">運輸署交通偵測器 · 有效車道平均</div>
        </div>
      </div>
      ${speedHtml}
      ${note}
      ${detLine}`;
    return card;
  }

  function renderTrafficSkeletons() {
    if (!el.trafficList) return;
    el.trafficList.innerHTML = '';
    (CFG.traffic || []).forEach(() => {
      const card = document.createElement('section');
      card.className = 'card traffic-card';
      card.innerHTML = `<div class="skeleton" style="height:28px;width:40%"></div>
        <div class="skeleton" style="height:20px;width:70%"></div>
        <div class="skeleton" style="height:48px;margin-top:10px"></div>`;
      el.trafficList.appendChild(card);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderEtaSkeletons() {
    if (!el.etaList) return;
    el.etaList.innerHTML = '';
    const items = resolveTransitList();
    items.forEach((item) => {
      const card = document.createElement('section');
      const t = item.type;
      card.className =
        t === 'mtr' ? 'card mtr-card' : t === 'placeholder' ? 'card placeholder-card' : 'card bus-card';
      card.innerHTML = `<div class="skeleton" style="height:28px;width:40%"></div>
        <div class="skeleton" style="height:20px;width:70%"></div>
        <div class="skeleton" style="height:48px;margin-top:10px"></div>`;
      el.etaList.appendChild(card);
    });
  }

  /* ---------- 搵巴士路線（獨立於固定 transit[] 三欄） ---------- */
  const SEARCH_LS_KEY = 'hkDashBusSearch';
  const searchState = {
    route: '',
    company: '',
    companies: [],
    variants: { kmb: [], ctb: [] },
    bound: '',
    serviceType: '1',
    stops: [],
    stopId: '',
    stopNameTc: '',
  };

  /** 九巴／龍運路線目錄（首次搜索後 session 內重用；唔係全港站列表） */
  const kmbRouteCatalog = { data: null, promise: null };
  /** key: company:route:inbound|outbound:serviceType → [{stopId,seq}] */
  const routeStopCache = new Map();
  /** key: company:stopId → {name_tc,name_en} */
  const stopNameCache = new Map();

  function normalizeRoute(input) {
    return String(input || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  function companyLabel(co) {
    return co === 'ctb' ? '城巴' : '九巴／龍運';
  }

  function setSearchStatus(msg, isError) {
    const box = el.searchStatus;
    if (!box) return;
    if (!msg) {
      box.hidden = true;
      box.textContent = '';
      box.classList.remove('is-error');
      return;
    }
    box.hidden = false;
    box.textContent = msg;
    box.classList.toggle('is-error', !!isError);
  }

  function clearSearchPanels(level) {
    // level: 'all' | 'dirs' | 'stops' | 'eta'
    if (level === 'all' && el.searchCompanies) {
      el.searchCompanies.hidden = true;
      el.searchCompanies.innerHTML = '';
    }
    if ((level === 'all' || level === 'dirs') && el.searchDirs) {
      el.searchDirs.hidden = true;
      el.searchDirs.innerHTML = '';
    }
    if ((level === 'all' || level === 'dirs' || level === 'stops') && el.searchStops) {
      el.searchStops.hidden = true;
      el.searchStops.innerHTML = '';
    }
    if (el.searchEta) el.searchEta.innerHTML = '';
    if (level === 'all' || level === 'dirs') {
      searchState.bound = '';
      searchState.serviceType = '1';
      searchState.stops = [];
      searchState.stopId = '';
      searchState.stopNameTc = '';
    } else if (level === 'stops') {
      searchState.stops = [];
      searchState.stopId = '';
      searchState.stopNameTc = '';
    } else if (level === 'eta') {
      searchState.stopId = '';
      searchState.stopNameTc = '';
    }
  }

  async function loadKmbRouteCatalog() {
    if (kmbRouteCatalog.data) return kmbRouteCatalog.data;
    if (kmbRouteCatalog.promise) return kmbRouteCatalog.promise;
    kmbRouteCatalog.promise = fetchJson(`${KMB_BASE}/route`).then((json) => {
      kmbRouteCatalog.data = Array.isArray(json.data) ? json.data : [];
      return kmbRouteCatalog.data;
    });
    try {
      return await kmbRouteCatalog.promise;
    } catch (err) {
      kmbRouteCatalog.promise = null;
      throw err;
    }
  }

  async function lookupKmbVariants(route) {
    const all = await loadKmbRouteCatalog();
    return all
      .filter((r) => String(r.route || '').toUpperCase() === route)
      .map((r) => ({
        company: 'kmb',
        route,
        bound: String(r.bound || '').toUpperCase(),
        serviceType: String(r.service_type || '1'),
        orig_tc: r.orig_tc || '',
        orig_en: r.orig_en || '',
        dest_tc: r.dest_tc || '',
        dest_en: r.dest_en || '',
      }));
  }

  function ctbRouteExists(data) {
    if (!data) return false;
    if (Array.isArray(data)) return data.length > 0 && ctbRouteExists(data[0]);
    return !!(data.route || data.orig_tc || data.dest_tc || data.orig_en);
  }

  async function lookupCtbRoute(route) {
    const json = await fetchJson(`${CTB_BASE}/route/CTB/${encodeURIComponent(route)}`);
    const raw = json && json.data;
    if (!ctbRouteExists(raw)) return null;
    const d = Array.isArray(raw) ? raw[0] : raw;
    if (d.route && String(d.route).toUpperCase() !== route) return null;
    return {
      company: 'ctb',
      route,
      orig_tc: d.orig_tc || '',
      orig_en: d.orig_en || '',
      dest_tc: d.dest_tc || '',
      dest_en: d.dest_en || '',
    };
  }

  async function fetchRouteStopIds(company, route, bound, serviceType) {
    const dir = String(bound).toUpperCase() === 'I' ? 'inbound' : 'outbound';
    const st = String(serviceType || '1');
    const cacheKey = `${company}:${route}:${dir}:${st}:ids`;
    if (routeStopCache.has(cacheKey)) return routeStopCache.get(cacheKey);
    const url =
      company === 'ctb'
        ? `${CTB_BASE}/route-stop/CTB/${encodeURIComponent(route)}/${dir}`
        : `${KMB_BASE}/route-stop/${encodeURIComponent(route)}/${dir}/${encodeURIComponent(st)}`;
    const json = await fetchJson(url);
    const rows = Array.isArray(json.data) ? json.data : [];
    const stops = rows
      .map((r) => ({
        stopId: r.stop,
        seq: Number(r.seq) || 0,
      }))
      .filter((s) => s.stopId)
      .sort((a, b) => a.seq - b.seq);
    routeStopCache.set(cacheKey, stops);
    return stops;
  }

  async function fetchStopName(company, stopId) {
    const key = `${company}:${stopId}`;
    if (stopNameCache.has(key)) return stopNameCache.get(key);
    const url =
      company === 'ctb'
        ? `${CTB_BASE}/stop/${encodeURIComponent(stopId)}`
        : `${KMB_BASE}/stop/${encodeURIComponent(stopId)}`;
    try {
      const json = await fetchJson(url);
      const d = json.data || {};
      const name = { name_tc: d.name_tc || '', name_en: d.name_en || '' };
      stopNameCache.set(key, name);
      return name;
    } catch (_) {
      const name = { name_tc: '', name_en: '' };
      stopNameCache.set(key, name);
      return name;
    }
  }

  async function mapPool(items, limit, fn) {
    const ret = new Array(items.length);
    let i = 0;
    async function worker() {
      while (i < items.length) {
        const idx = i++;
        ret[idx] = await fn(items[idx], idx);
      }
    }
    const n = Math.min(Math.max(1, limit), Math.max(1, items.length));
    if (!items.length) return ret;
    await Promise.all(Array.from({ length: n }, () => worker()));
    return ret;
  }

  async function hydrateStopNames(company, stops) {
    await mapPool(stops, 8, (s) => fetchStopName(company, s.stopId));
    return stops.map((s) => {
      const n = stopNameCache.get(`${company}:${s.stopId}`) || {};
      return { ...s, name_tc: n.name_tc || s.stopId, name_en: n.name_en || '' };
    });
  }

  async function lookupCtbDirections(route, meta) {
    const candidates = [
      {
        company: 'ctb',
        route,
        bound: 'O',
        serviceType: '1',
        orig_tc: meta.orig_tc,
        orig_en: meta.orig_en,
        dest_tc: meta.dest_tc,
        dest_en: meta.dest_en,
      },
      {
        company: 'ctb',
        route,
        bound: 'I',
        serviceType: '1',
        orig_tc: meta.dest_tc,
        orig_en: meta.dest_en,
        dest_tc: meta.orig_tc,
        dest_en: meta.orig_en,
      },
    ];
    const out = [];
    for (const v of candidates) {
      try {
        const ids = await fetchRouteStopIds('ctb', route, v.bound, '1');
        if (ids.length) out.push(v);
      } catch (_) {
        /* 呢個方向冇站序就跳過 */
      }
    }
    return out;
  }

  function loadSavedSearch() {
    try {
      const raw = localStorage.getItem(SEARCH_LS_KEY);
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || !o.route) return null;
      return o;
    } catch (_) {
      return null;
    }
  }

  function saveSearchSelection() {
    if (!searchState.route || !searchState.company || !searchState.stopId) return;
    try {
      localStorage.setItem(
        SEARCH_LS_KEY,
        JSON.stringify({
          route: searchState.route,
          company: searchState.company,
          bound: searchState.bound,
          serviceType: searchState.serviceType || '1',
          stopId: searchState.stopId,
          stopNameTc: searchState.stopNameTc || '',
        })
      );
    } catch (_) {
      /* private mode 等 */
    }
  }

  function clearSavedSearch() {
    try {
      localStorage.removeItem(SEARCH_LS_KEY);
    } catch (_) {
      /* ignore */
    }
  }

  function isCurrentPinned() {
    const saved = loadSavedSearch();
    return !!(
      saved &&
      saved.route === searchState.route &&
      saved.company === searchState.company &&
      saved.bound === searchState.bound &&
      String(saved.serviceType || '1') === String(searchState.serviceType || '1') &&
      saved.stopId === searchState.stopId
    );
  }

  function renderCompanyTabs() {
    const box = el.searchCompanies;
    if (!box) return;
    const cos = searchState.companies;
    box.innerHTML = '';
    if (!cos.length) {
      box.hidden = true;
      return;
    }
    // 只有一間公司都顯示標籤，方便確認來源
    cos.forEach((co) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `search-chip${co === 'ctb' ? ' ctb' : ''}`;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-pressed', co === searchState.company ? 'true' : 'false');
      btn.textContent = companyLabel(co);
      btn.addEventListener('click', () => {
        if (searchState.company === co) return;
        selectCompany(co);
      });
      box.appendChild(btn);
    });
    box.hidden = false;
  }

  function renderDirectionChips() {
    const box = el.searchDirs;
    if (!box) return;
    const variants = searchState.variants[searchState.company] || [];
    box.innerHTML = '';
    if (!variants.length) {
      box.hidden = true;
      return;
    }
    variants.forEach((v) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-chip';
      const active =
        searchState.bound === v.bound &&
        String(searchState.serviceType || '1') === String(v.serviceType || '1');
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      const arrow = `${v.orig_tc || '起點'} → ${v.dest_tc || '終點'}`;
      const extra =
        String(v.serviceType || '1') !== '1' ? ` · 特別班次 ${v.serviceType}` : '';
      const boundTag = v.bound === 'I' ? '回程' : '去程';
      btn.textContent = `${arrow}${extra}`;
      btn.title = `${boundTag}${extra}`;
      btn.addEventListener('click', () => {
        selectDirection(v);
      });
      box.appendChild(btn);
    });
    box.hidden = false;
  }

  function renderStopList() {
    const box = el.searchStops;
    if (!box) return;
    box.innerHTML = '';
    const stops = searchState.stops || [];
    if (!stops.length) {
      box.hidden = true;
      return;
    }
    stops.forEach((s) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-stop';
      btn.setAttribute('aria-pressed', s.stopId === searchState.stopId ? 'true' : 'false');
      const en = s.name_en
        ? `<span class="stop-en">${escapeHtml(s.name_en)}</span>`
        : '';
      btn.innerHTML = `<span class="seq">${escapeHtml(String(s.seq))}</span><span>${escapeHtml(
        s.name_tc || s.stopId
      )}${en}</span>`;
      btn.addEventListener('click', () => {
        selectStop(s);
      });
      box.appendChild(btn);
    });
    box.hidden = false;
    const active = box.querySelector('.search-stop[aria-pressed="true"]');
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  function renderPinRow() {
    if (!el.searchEta || !searchState.stopId) return;
    let row = el.searchEta.querySelector('.search-pin-row');
    if (row) row.remove();
    row = document.createElement('div');
    row.className = 'search-pin-row';
    const pinned = isCurrentPinned();
    const note = document.createElement('div');
    note.textContent = pinned
      ? '已記住此站，刷新後仍會顯示（唔會改固定欄）'
      : '可記住此站，刷新後還原查詢（唔會改 config.js）';
    const actions = document.createElement('div');
    actions.className = 'pin-actions';
    const pinBtn = document.createElement('button');
    pinBtn.type = 'button';
    pinBtn.textContent = pinned ? '已針選' : '針選此站';
    pinBtn.className = pinned ? 'is-pinned' : '';
    pinBtn.addEventListener('click', () => {
      saveSearchSelection();
      renderPinRow();
    });
    actions.appendChild(pinBtn);
    if (pinned || loadSavedSearch()) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.textContent = '清除記住';
      clearBtn.addEventListener('click', () => {
        clearSavedSearch();
        renderPinRow();
      });
      actions.appendChild(clearBtn);
    }
    row.appendChild(note);
    row.appendChild(actions);
    el.searchEta.appendChild(row);
  }

  async function refreshSearchEta(opts) {
    const quiet = !!(opts && opts.quiet);
    if (!el.searchEta || !searchState.stopId || !searchState.route || !searchState.company) {
      return;
    }
    const snap = {
      route: searchState.route,
      company: searchState.company,
      stopId: searchState.stopId,
      bound: searchState.bound,
      serviceType: searchState.serviceType,
    };
    const cfg = {
      company: snap.company,
      type: snap.company,
      route: snap.route,
      stopId: snap.stopId,
      stopNameTc: searchState.stopNameTc,
      serviceType: snap.serviceType || 1,
      bound: snap.bound,
      label: `${companyLabel(snap.company)} · 搜尋`,
    };
    if (!quiet) {
      el.searchEta.innerHTML = `<section class="card bus-card"><div class="skeleton" style="height:28px;width:40%"></div>
        <div class="skeleton" style="height:20px;width:70%"></div>
        <div class="skeleton" style="height:48px;margin-top:10px"></div></section>`;
    }
    try {
      const data = await loadBusEta(cfg);
      if (
        searchState.stopId !== snap.stopId ||
        searchState.route !== snap.route ||
        searchState.company !== snap.company ||
        searchState.bound !== snap.bound
      ) {
        return;
      }
      el.searchEta.innerHTML = '';
      el.searchEta.appendChild(renderBusCard(data));
      renderPinRow();
    } catch (err) {
      if (searchState.stopId !== snap.stopId) return;
      el.searchEta.innerHTML = '';
      el.searchEta.appendChild(renderBusCard(cfg, err));
      renderPinRow();
    }
  }

  async function selectStop(stop) {
    searchState.stopId = stop.stopId;
    searchState.stopNameTc = stop.name_tc || '';
    renderStopList();
    saveSearchSelection();
    await refreshSearchEta({ quiet: false });
  }

  async function selectDirection(variant, preferStopId) {
    searchState.bound = variant.bound;
    searchState.serviceType = String(variant.serviceType || '1');
    searchState.stops = [];
    searchState.stopId = '';
    searchState.stopNameTc = '';
    renderDirectionChips();
    if (el.searchEta) el.searchEta.innerHTML = '';
    if (el.searchStops) {
      el.searchStops.hidden = false;
      el.searchStops.innerHTML = `<div class="empty-eta" style="padding:12px">載入站序…</div>`;
    }
    setSearchStatus('載入站序…');
    try {
      const ids = await fetchRouteStopIds(
        searchState.company,
        searchState.route,
        searchState.bound,
        searchState.serviceType
      );
      if (
        searchState.bound !== variant.bound ||
        String(searchState.serviceType) !== String(variant.serviceType || '1')
      ) {
        return;
      }
      if (!ids.length) {
        searchState.stops = [];
        if (el.searchStops) {
          el.searchStops.hidden = false;
          el.searchStops.innerHTML = `<div class="empty-eta" style="padding:12px">呢個方向暫時未有站序資料</div>`;
        }
        setSearchStatus('');
        return;
      }
      const stops = await hydrateStopNames(searchState.company, ids);
      if (searchState.bound !== variant.bound) return;
      searchState.stops = stops;
      renderStopList();
      setSearchStatus('');
      if (preferStopId) {
        const hit = stops.find((s) => s.stopId === preferStopId);
        if (hit) await selectStop(hit);
      }
    } catch (err) {
      if (el.searchStops) {
        el.searchStops.hidden = false;
        el.searchStops.innerHTML = `<div class="error-box">站序載入失敗：${escapeHtml(
          String(err.message || err)
        )}</div>`;
      }
      setSearchStatus('站序載入失敗', true);
    }
  }

  function selectCompany(company, prefer) {
    searchState.company = company;
    clearSearchPanels('dirs');
    renderCompanyTabs();
    const variants = searchState.variants[company] || [];
    if (!variants.length) {
      setSearchStatus(`搵唔到${companyLabel(company)}「${searchState.route}」嘅方向資料`, true);
      return;
    }
    renderDirectionChips();
    const prefBound = prefer && prefer.bound;
    const prefSt = prefer && String(prefer.serviceType || '1');
    const match =
      (prefBound &&
        variants.find(
          (v) => v.bound === prefBound && String(v.serviceType || '1') === prefSt
        )) ||
      variants[0];
    return selectDirection(match, prefer && prefer.stopId);
  }

  async function runBusSearch(opts) {
    const prefer = opts || {};
    const route = normalizeRoute(
      prefer.route != null ? prefer.route : (el.searchInput && el.searchInput.value) || ''
    );
    if (el.searchInput) el.searchInput.value = route;
    if (!route) {
      setSearchStatus('請輸入路線號碼，例如 258D、1A、969。', true);
      return;
    }
    if (!/^[A-Z0-9]{1,8}$/.test(route)) {
      setSearchStatus('路線號碼格式無效。請輸入字母或數字，例如 258D、1A、969。', true);
      return;
    }

    searchState.route = route;
    searchState.company = '';
    searchState.companies = [];
    searchState.variants = { kmb: [], ctb: [] };
    clearSearchPanels('all');
    setSearchStatus('搜索中…');
    if (el.searchBtn) el.searchBtn.disabled = true;

    const kmbP = lookupKmbVariants(route).then(
      (rows) => ({ ok: true, rows }),
      (err) => ({ ok: false, err })
    );
    const ctbP = lookupCtbRoute(route).then(
      async (meta) => {
        if (!meta) return { ok: true, rows: [] };
        const rows = await lookupCtbDirections(route, meta);
        return { ok: true, rows };
      },
      (err) => ({ ok: false, err })
    );

    let kmbRes;
    let ctbRes;
    try {
      [kmbRes, ctbRes] = await Promise.all([kmbP, ctbP]);
    } finally {
      if (el.searchBtn) el.searchBtn.disabled = false;
    }

    if (searchState.route !== route) return;

    const errors = [];
    if (kmbRes.ok && kmbRes.rows.length) {
      searchState.variants.kmb = kmbRes.rows;
      searchState.companies.push('kmb');
    } else if (!kmbRes.ok) {
      errors.push(`九巴／龍運：${kmbRes.err && kmbRes.err.message ? kmbRes.err.message : '載入失敗'}`);
    }
    if (ctbRes.ok && ctbRes.rows.length) {
      searchState.variants.ctb = ctbRes.rows;
      searchState.companies.push('ctb');
    } else if (!ctbRes.ok) {
      errors.push(`城巴：${ctbRes.err && ctbRes.err.message ? ctbRes.err.message : '載入失敗'}`);
    }

    if (!searchState.companies.length) {
      if (errors.length && !kmbRes.ok && !ctbRes.ok) {
        setSearchStatus(`載入失敗。${errors.join('；')}`, true);
      } else if (errors.length) {
        setSearchStatus(`搵唔到路線 ${route}（${errors.join('；')}）。`, true);
      } else {
        setSearchStatus(`搵唔到路線 ${route}。請確認路線號碼（例如 258D、1A、969）。`, true);
      }
      return;
    }

    if (errors.length) {
      setSearchStatus(`已找到部分資料。${errors.join('；')}`);
    } else {
      setSearchStatus('');
    }

    renderCompanyTabs();
    const preferredCo =
      prefer.company && searchState.companies.includes(prefer.company)
        ? prefer.company
        : searchState.companies[0];
    await selectCompany(preferredCo, prefer);
  }

  function initBusSearch() {
    if (!el.searchForm) return;
    el.searchForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      runBusSearch();
    });
    const saved = loadSavedSearch();
    if (saved && saved.route) {
      if (el.searchInput) el.searchInput.value = saved.route;
      runBusSearch(saved).catch((err) => {
        console.warn('還原已記住嘅巴士搜尋失敗', err);
        setSearchStatus('還原上次查詢失敗，請重新搜索。', true);
      });
    }
  }


  async function refresh() {
    const transitItems = resolveTransitList();
    const trafficSegs = CFG.traffic || [];

    if (!transitItems.length && el.etaList) {
      el.etaList.innerHTML = `<div class="card error-box">config.js 未設定 transit（或 stops／mtr）</div>`;
    }
    if (!trafficSegs.length && el.trafficList) {
      el.trafficList.innerHTML = `<div class="card empty-eta">config.js 未設定道路交通（traffic 陣列）</div>`;
    }

    const wxPromise = loadWeather()
      .then((wx) => renderWeather(wx))
      .catch((err) => renderWeather(null, err));

    const etaPromises = transitItems.map((item) => loadTransitItem(item));

    // 重置 cache，令每次 refresh 拉最新 XML
    trafficCache = null;
    trafficCacheAt = 0;
    const trafficPromises = trafficSegs.map(async (s) => {
      try {
        const data = await loadTrafficSegment(s);
        return renderTrafficCard(data);
      } catch (err) {
        return renderTrafficCard(s, err);
      }
    });

    const searchEtaPromise = refreshSearchEta({ quiet: true }).catch((err) => {
      console.warn('搜尋 ETA 刷新失敗', err);
    });

    const [etaCards, trafficCards] = await Promise.all([
      Promise.all(etaPromises),
      Promise.all(trafficPromises),
      wxPromise,
      searchEtaPromise,
    ]);

    if (transitItems.length && el.etaList) {
      el.etaList.innerHTML = '';
      etaCards.forEach((c) => el.etaList.appendChild(c));
    }
    if (trafficSegs.length && el.trafficList) {
      el.trafficList.innerHTML = '';
      trafficCards.forEach((c) => el.trafficList.appendChild(c));
    }

    el.lastUpdated.textContent = `更新 ${formatHkTime(new Date())} HKT`;
    nextRefreshAt = Date.now() + REFRESH_MS;
  }

  function startCountdown() {
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      const left = Math.max(0, Math.ceil((nextRefreshAt - Date.now()) / 1000));
      el.countdown.textContent = left ? `${left}s 後刷新` : '刷新中…';
    }, 500);
  }

  async function loop() {
    renderEtaSkeletons();
    renderTrafficSkeletons();
    try {
      await refresh();
    } catch (e) {
      console.error(e);
    }
    startCountdown();
    setTimeout(loop, REFRESH_MS);
  }

  if (!window.HK_DASH_CONFIG && el.etaList) {
    el.etaList.innerHTML = `<div class="card error-box">缺少 config.js</div>`;
  }
  initBusSearch();
  loop();
})();
