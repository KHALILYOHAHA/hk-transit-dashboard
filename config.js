/**
 * 香港巴士站／路線設定（改呢度就得）
 * =====================================
 * 點搵 stopId（九巴 KMB）：
 *  1. 睇路線站序：
 *     https://data.etabus.gov.hk/v1/transport/kmb/route-stop/{路線}/{outbound|inbound}/{serviceType}
 *  2. 用 stop 欄位嘅 ID，再核對站名：
 *     https://data.etabus.gov.hk/v1/transport/kmb/stop/{stopId}
 *  3. 核對 ETA：
 *     https://data.etabus.gov.hk/v1/transport/kmb/eta/{stopId}/{route}/{serviceType}
 *
 * company / type: 'kmb' | 'ctb' | 'mtr' | 'placeholder'
 * bound: 'O' = outbound（去程）, 'I' = inbound（回程）— 用嚟過濾 KMB ETA 方向
 * serviceType: 多數係 1；特別班次先至會係 2、3…
 *
 * ---------- Citybus 城巴（CTB）----------
 * ETA：
 *   https://rt.data.gov.hk/v2/transport/citybus/eta/CTB/{stopId}/{route}
 * 路線站序：
 *   https://rt.data.gov.hk/v2/transport/citybus/route-stop/CTB/{route}/{inbound|outbound}
 * 站資料：
 *   https://rt.data.gov.hk/v2/transport/citybus/stop/{stopId}
 *
 * ⚠ 用戶原想 CTB 969 往灣仔／台山小學，但官方 969 唔停此站——唔好發明 969 ETA。
 * 已改用開放數據匹配：九巴／龍運 960 @ EB64718829DFC071（台山小學 TM472）往會展站。
 *
 * ---------- 港鐵 MTR Next Train ----------
 *   https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line={線}&sta={站}&lang=TC
 * line 例：TML 屯馬線 …
 * station 例：TUM 屯門 …
 * direction：'UP' | 'DOWN' | 'BOTH'
 * 核對：getSchedule.php?line=TML&sta=TUM → DOWN→WKS（烏溪沙）
 *
 * ---------- 道路交通（屯門市中心 ↔ 圓方、圓方 ↔ 黃大仙）----------
 *   https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml
 *
 * ---------- 公共交通 ETA 列 ----------
 * transit[] 驅動三欄固定次序（左→右）。每項 type：
 *   'kmb' | 'ctb' | 'mtr' | 'placeholder'
 * 舊 stops[] / mtr[] 已棄用（保留空陣列兼容）；請改 transit。
 */
window.HK_DASH_CONFIG = {
  /** 自動刷新秒數 */
  refreshSeconds: 45,

  /** 天氣：hko（香港天文台，中文）或 open-meteo */
  weatherProvider: 'hko',

  /**
   * 公共交通 ETA（固定三欄：258D | 960 | 港鐵屯門）
   */
  transit: [
    {
      type: 'kmb',
      label: '258D · 往藍田',
      company: 'kmb',
      route: '258D',
      stopId: 'C821EBC3DFFC50D8', // 大興商場
      stopNameTc: '大興商場',
      serviceType: 1,
      bound: 'O', // 往藍田
    },
    // 用戶原想 969 往灣仔／台山小學，但 CTB 969 官方不停此站。
    // 開放數據匹配：九巴／龍運 960 @ 台山小學 (TM472) 往會展站。
    {
      type: 'kmb',
      label: '960 · 往會展',
      company: 'kmb',
      route: '960',
      stopId: 'EB64718829DFC071', // 台山小學 TM472
      stopNameTc: '台山小學',
      serviceType: 1,
      bound: 'O', // 往會展站（ETA API 已核對）
    },
    {
      type: 'mtr',
      label: '屯馬線 · 屯門',
      line: 'TML',
      station: 'TUM',
      stationNameTc: '屯門',
      direction: 'DOWN', // DOWN → WKS 烏溪沙
    },
  ],

  /** @deprecated 改用 transit；留空以免載入示範站 */
  stops: [],

  /** @deprecated 改用 transit；留空以免載入示範港鐵 */
  mtr: [],

  /**
   * 道路交通車速（運輸署交通偵測器 Raw Data）
   * 四段固定次序（與頁面一致）：
   *  1. 屯門市中心 → 圓方
   *  2. 圓方 → 黃大仙
   *  3. 黃大仙 → 圓方
   *  4. 圓方 → 屯門市中心
   *
   * detectorId 來源：官方位置 CSV
   *   https://static.data.gov.hk/td/traffic-data-strategic-major-roads/info/traffic_speed_volume_occ_info.csv
   * 車速：rawSpeedVol-all.xml；只用 valid=Y 且 1–130 km/h 嘅車道平均，唔虛構數字。
   *
   * 走廊揀法（同一方向、沿途間隔約 4–6 個常有數據嘅偵測器）：
   *  - 屯門市中心 ↔ 圓方：市中心皇珠路 → 屯門公路（置樂／轉乘站／深井）→ 荃灣路 → 青葵公路 → 西九龍公路近圓方／九龍站。
   *  - 圓方 ↔ 黃大仙：西九龍公路（官方圖無「連翔道」偵測器）→ 呈祥道 → 龍翔道近黃大仙。
   * 已知間中缺數、因此冇選：TDS90026（深井西行 2）、TDS91030（青山灣東行）、
   *   AID03114（西九龍公路近青沙公路北行）、AID03203（西九龍公路近海麗邨南行）。
   * 官方圖亦無青葵公路北行偵測器，回程靠西九龍公路北行接荃灣路。
   */
  traffic: [
    {
      label: '屯門市中心 → 圓方',
      roadNameTc: '東行 · 往圓方／九龍',
      note: '市中心皇珠路／置樂、轉乘站、深井、荃灣路至西九龍公路一帶偵測器平均',
      detectorIds: [
        'TDSLFR10003', // 皇珠路近屯門鄉事會路 - 東行（市中心起點）
        'TDS91032',    // 屯門公路近置樂花園 - 南行（入公路）
        'TDS91020',    // 屯門公路近屯門公路巴士轉乘站 - 東行 (1)
        'TDS91011',    // 屯門公路近深井 - 東行 (3)
        'AID05203',    // 荃灣路近港鐵荃灣西站 - 南行
        'AID03211',    // 西九龍公路近百周年變電站 - 南行（圓方／九龍站）
      ],
    },
    {
      label: '圓方 → 黃大仙',
      roadNameTc: '北行／東行 · 往黃大仙',
      note: '西九龍公路、呈祥道至龍翔道黃大仙一帶偵測器平均',
      detectorIds: [
        'AID03106', // 西九龍公路近百周年變電站 - 北行（圓方起點）
        'AID03111', // 西九龍公路近港鐵南昌站 - 北行
        'AID07201', // 呈祥道近清麗苑 - 東行（七號幹道）
        'AID07205', // 呈祥道近明愛醫院 - 東行
        'AID07210', // 龍翔道近觀景台 - 東行
        'AID07214', // 龍翔道近黃大仙中心北館 - 東行（終點）
      ],
    },
    {
      label: '黃大仙 → 圓方',
      roadNameTc: '西行／南行 · 往圓方',
      note: '龍翔道黃大仙、呈祥道至西九龍公路一帶偵測器平均',
      detectorIds: [
        'AID07119', // 龍翔道近黃大仙下邨（二區）龍安樓 - 西行（起點）
        'AID07126', // 龍翔道近畢架山花園 - 西行 (2)
        'AID07133', // 呈祥道近荔枝角公園體育館 - 西行
        'AID03204', // 西九龍公路近興華街 - 南行（AID03203 海麗邨間中缺數，改用此）
        'AID03208', // 西九龍公路近港鐵奧運站 - 南行
        'AID03211', // 西九龍公路近百周年變電站 - 南行（圓方終點）
      ],
    },
    {
      label: '圓方 → 屯門市中心',
      roadNameTc: '西行 · 往屯門市中心',
      note: '西九龍公路、荃灣路、深井、轉乘站至市中心皇珠路一帶偵測器平均',
      detectorIds: [
        'AID03106',    // 西九龍公路近百周年變電站 - 北行（圓方起點）
        'AID03111',    // 西九龍公路近港鐵南昌站 - 北行
        'AID05133',    // 荃灣路近港鐵荃灣西站 - 北行（官方圖無青葵公路北行）
        'TDS90027',    // 屯門公路近深井 - 西行 (3)（TDS90026 間中缺數，唔用）
        'TDS90036',    // 屯門公路近屯門公路巴士轉乘站 - 西行 (1)
        'TDSLFR20002', // 皇珠路近屯門鄉事會路 - 西行（市中心終點）
      ],
    },
  ],
};
