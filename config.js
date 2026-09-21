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
 * ---------- 道路交通（屯門公路等）----------
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
   * 左：屯門公路 → 圓方（東行／往九龍）
   * 右：圓方 → 屯門（西行／往屯門）
   */
  traffic: [
    {
      label: '屯門公路 → 圓方',
      roadNameTc: '東行 · 往圓方／九龍',
      note: '深井／汀九／轉乘站／麗城一帶偵測器平均',
      detectorIds: [
        'TDS91011', // 近深井 - 東行 (3)
        'TDS91010', // 近深井 - 東行 (2)
        'TDS91008', // 近汀九 - 東行 (5)
        'TDS91020', // 近屯門公路巴士轉乘站 - 東行 (1)
        'AID05201', // 近麗城花園一期停車場 - 東行
      ],
    },
    {
      label: '圓方 → 屯門',
      roadNameTc: '西行 · 往屯門',
      note: '深井／轉乘站／荃灣路一帶偵測器平均',
      detectorIds: [
        'TDS90027', // 近深井 - 西行 (3)
        'TDS90026', // 近深井 - 西行 (2)
        'TDS90036', // 近屯門公路巴士轉乘站 - 西行 (1)
        'TDS90037', // 近屯門公路巴士轉乘站 - 西行 (2)
        'TDS90016', // 近荃灣路 - 西行
      ],
    },
  ],
};
