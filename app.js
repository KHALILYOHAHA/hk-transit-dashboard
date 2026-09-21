/**
 * HK Transit + Weather Dashboard
 * Pure static — HKO weather + KMB bus ETAs + MTR Next Train (official open data).
 */
(function () {
  'use strict';

  const CFG = window.HK_DASH_CONFIG || { stops: [], mtr: [], refreshSeconds: 45 };
  const REFRESH_MS = Math.max(15, Number(CFG.refreshSeconds) || 45) * 1000;
  const KMB_BASE = 'https://data.etabus.gov.hk/v1/transport/kmb';
  const MTR_BASE = 'https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php';
  const HKO_RHR = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc';
  const HKO_FLW = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=flw&lang=tc';
  const OPEN_METEO =
    'https://api.open-meteo.com/v1/forecast?latitude=22.3193&longitude=114.1694' +
    '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FHong_Kong';

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
    busList: document.getElementById('bus-list'),
    mtrList: document.getElementById('mtr-list'),
    lastUpdated: document.getElementById('last-updated'),
    countdown: document.getElementById('countdown'),
  };

  let nextRefreshAt = 0;
  let tickTimer = null;

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

  async function loadHko() {
    const [rhr, flw] = await Promise.all([fetchJson(HKO_RHR), fetchJson(HKO_FLW).catch(() => null)]);
    const temps = rhr.temperature?.data || [];
    const hko = temps.find((t) => t.place === '香港天文台') || temps[0];
    const humidity = rhr.humidity?.data?.[0]?.value;
    const iconCode = Array.isArray(rhr.icon) ? rhr.icon[0] : rhr.icon;
    const mapped = HKO_ICON_MAP[iconCode] || { emoji: '🌡️', label: '天氣' };
    const forecast = flw?.forecastDesc || flw?.generalSituation || '';
    const uv = rhr.uvindex?.data?.[0];
    return {
      temp: hko?.value,
      unit: hko?.unit || 'C',
      humidity,
      emoji: mapped.emoji,
      condition: forecast ? forecast.split(/[。．]/)[0] : mapped.label,
      details: [
        humidity != null ? `濕度 ${humidity}%` : null,
        uv ? `紫外線 ${uv.value}（${uv.desc}）` : null,
        `觀測：${hko?.place || '香港'}`,
      ].filter(Boolean),
      source: 'HKO',
    };
  }

  async function loadOpenMeteo() {
    const data = await fetchJson(OPEN_METEO);
    const c = data.current || {};
    const mapped = WMO_MAP[c.weather_code] || { emoji: '🌡️', label: `代碼 ${c.weather_code}` };
    return {
      temp: Math.round(c.temperature_2m),
      unit: 'C',
      humidity: c.relative_humidity_2m,
      emoji: mapped.emoji,
      condition: mapped.label,
      details: [
        c.relative_humidity_2m != null ? `濕度 ${c.relative_humidity_2m}%` : null,
        c.wind_speed_10m != null ? `風速 ${c.wind_speed_10m} km/h` : null,
        'Open-Meteo',
      ].filter(Boolean),
      source: 'Open-Meteo',
    };
  }

  function renderWeather(wx, err) {
    if (err) {
      el.wxIcon.textContent = '⚠️';
      el.wxTemp.innerHTML = '—';
      el.wxCond.textContent = '天氣載入失敗';
      el.wxDetails.innerHTML = `<span class="error-box" style="display:inline-block">${escapeHtml(String(err.message || err))}</span>`;
      return;
    }
    el.wxIcon.textContent = wx.emoji || '🌡️';
    el.wxTemp.innerHTML = `${wx.temp != null ? wx.temp : '—'}<span>°${wx.unit || 'C'}</span>`;
    el.wxCond.textContent = wx.condition || '';
    el.wxDetails.innerHTML = (wx.details || [])
      .map((d) => `<span>${escapeHtml(d)}</span>`)
      .join('');
  }

  async function loadBusEta(stopCfg) {
    if (stopCfg.company !== 'kmb') {
      throw new Error(`未支援公司：${stopCfg.company}`);
    }
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
      stopNameTc,
      stopNameEn,
      destTc,
      destEn,
      etas: rows,
    };
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
    card.className = 'card bus-card';
    if (err) {
      card.innerHTML = `
        <div class="top">
          <div class="route-badge">${escapeHtml(data.route || '?')}</div>
          <div class="route-meta">
            <div class="label">${escapeHtml(data.label || '')}</div>
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
      data.etas.map((e) => ({
        eta: e.eta,
        rmk: e.rmk_tc || '',
      }))
    );

    card.innerHTML = `
      <div class="top">
        <div class="route-badge">${escapeHtml(data.route)}</div>
        <div class="route-meta">
          <div class="label">${escapeHtml(data.label || 'KMB')}</div>
          <div class="dest" title="${escapeHtml(data.destEn || '')}">${escapeHtml(dest)}</div>
          <div class="stop-name">${escapeHtml(data.stopNameTc || '')}${
            data.stopNameEn ? ` · <span style="opacity:.8">${escapeHtml(data.stopNameEn)}</span>` : ''
          }</div>
        </div>
      </div>
      ${chips}`;
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
      body = renderMtrDirBlock('下行 DOWN', data.down);
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderBusSkeletons() {
    el.busList.innerHTML = '';
    (CFG.stops || []).forEach(() => {
      const card = document.createElement('section');
      card.className = 'card bus-card';
      card.innerHTML = `<div class="skeleton" style="height:28px;width:40%"></div>
        <div class="skeleton" style="height:20px;width:70%"></div>
        <div class="skeleton" style="height:48px;margin-top:10px"></div>`;
      el.busList.appendChild(card);
    });
  }

  function renderMtrSkeletons() {
    if (!el.mtrList) return;
    el.mtrList.innerHTML = '';
    (CFG.mtr || []).forEach(() => {
      const card = document.createElement('section');
      card.className = 'card mtr-card';
      card.innerHTML = `<div class="skeleton" style="height:28px;width:40%"></div>
        <div class="skeleton" style="height:20px;width:70%"></div>
        <div class="skeleton" style="height:48px;margin-top:10px"></div>`;
      el.mtrList.appendChild(card);
    });
  }

  async function refresh() {
    const stops = CFG.stops || [];
    const mtrStops = CFG.mtr || [];

    if (!stops.length && el.busList) {
      el.busList.innerHTML = `<div class="card error-box">config.js 未設定任何巴士站點</div>`;
    }
    if (!mtrStops.length && el.mtrList) {
      el.mtrList.innerHTML = `<div class="card empty-eta">config.js 未設定港鐵站（mtr 陣列）</div>`;
    }

    const wxPromise = loadWeather()
      .then((wx) => renderWeather(wx))
      .catch((err) => renderWeather(null, err));

    const busPromises = stops.map(async (s) => {
      try {
        const data = await loadBusEta(s);
        return renderBusCard(data);
      } catch (err) {
        return renderBusCard(s, err);
      }
    });

    const mtrPromises = mtrStops.map(async (s) => {
      try {
        const data = await loadMtrEta(s);
        return renderMtrCard(data);
      } catch (err) {
        return renderMtrCard(s, err);
      }
    });

    const [busCards, mtrCards] = await Promise.all([
      Promise.all(busPromises),
      Promise.all(mtrPromises),
      wxPromise,
    ]);

    if (stops.length && el.busList) {
      el.busList.innerHTML = '';
      busCards.forEach((c) => el.busList.appendChild(c));
    }
    if (mtrStops.length && el.mtrList) {
      el.mtrList.innerHTML = '';
      mtrCards.forEach((c) => el.mtrList.appendChild(c));
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
    renderBusSkeletons();
    renderMtrSkeletons();
    try {
      await refresh();
    } catch (e) {
      console.error(e);
    }
    startCountdown();
    setTimeout(loop, REFRESH_MS);
  }

  if (!CFG.stops && el.busList) {
    el.busList.innerHTML = `<div class="card error-box">缺少 config.js</div>`;
  }
  loop();
})();
