/**
 * 香港巴士站／路線設定（改呢度就得）
 * =====================================
 * 點搵 stopId：
 *  1. 睇路線站序：
 *     https://data.etabus.gov.hk/v1/transport/kmb/route-stop/{路線}/{outbound|inbound}/{serviceType}
 *     例：.../route-stop/1A/outbound/1
 *  2. 用 stop 欄位嘅 ID，再核對站名：
 *     https://data.etabus.gov.hk/v1/transport/kmb/stop/{stopId}
 *  3. 核對 ETA：
 *     https://data.etabus.gov.hk/v1/transport/kmb/eta/{stopId}/{route}/{serviceType}
 *
 * company: 'kmb'（目前支援九巴／龍運 open data）
 * bound: 'O' = outbound（去程）, 'I' = inbound（回程）— 用嚟過濾 ETA 方向
 * serviceType: 多數係 1；特別班次先至會係 2、3…
 *
 * ---------- 港鐵 MTR Next Train ----------
 * 官方開放數據（免 API key）：
 *   https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line={線}&sta={站}&lang=TC
 * 說明／站碼：https://opendata.mtr.com.hk/doc/Next_Train_API_Spec_v1.7.pdf
 *   data.gov.hk 資料集：Real-time MTR train information
 *
 * line 例：ISL 港島線、TWL 荃灣線、KTL 觀塘線、TCL 東涌線、
 *         TKL 將軍澳線、EAL 東鐵、TML 屯馬、SIL 南港島、AEL 機場、DRL 迪士尼
 * station 例：CEN 中環、ADM 金鐘、TST 尖沙咀、HOK 香港、TUC 東涌…
 * direction：'UP' | 'DOWN' | 'BOTH'（預設 BOTH，顯示兩個方向）
 * stationNameTc（可選）：顯示用中文站名；唔填會用內建對照表
 *
 * ---------- 道路交通（屯門公路等）----------
 * 運輸署「主要幹道／策略性道路交通數據」開放數據（data.gov.hk）：
 *   實時車速 Raw XML（約每 1 分鐘）：
 *     https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml
 *   偵測器位置 CSV（搵 detectorId／路名）：
 *     https://static.data.gov.hk/td/traffic-data-strategic-major-roads/info/traffic_speed_volume_occ_info.csv
 *   規格 PDF：
 *     https://static.data.gov.hk/td/traffic-data-strategic-major-roads/dataspec/dataspec-traffic-data-strategic-major-roads.pdf
 *   資料集：Traffic Data of Strategic / Major Roads（hk-td-sm_4）
 *
 * traffic[] 每項：
 *   label          顯示標籤
 *   roadNameTc     路段說明（繁中）
 *   detectorIds    官方 AID_ID_Number／detector_id 陣列（會取有效車道平均車速）
 *   （可選）note   補充說明
 *
 * 核對例：
 *   curl -sL "https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml" | rg "TDS91011|TDS90027"
 */
window.HK_DASH_CONFIG = {
  /** 自動刷新秒數 */
  refreshSeconds: 45,

  /** 天氣：hko（香港天文台，中文）或 open-meteo */
  weatherProvider: 'hko',

  stops: [
    {
      label: '示範·九巴1A',
      company: 'kmb',
      route: '1A',
      stopId: 'CC811B604DD883AE', // 德福花園 (KT657)
      stopNameTc: '德福花園',
      stopNameEn: 'Telford Gardens',
      serviceType: 1,
      bound: 'O', // 往尖沙咀碼頭
    },
    {
      label: '示範·九巴104',
      company: 'kmb',
      route: '104',
      stopId: '010D8E1BE34538EE', // 堅尼地城巴士總站
      stopNameTc: '堅尼地城巴士總站',
      stopNameEn: 'Kennedy Town Bus Terminus',
      serviceType: 1,
      bound: 'O', // 往深水埗(白田邨)
    },
  ],

  /**
   * 港鐵班次（MTR Next Train）
   * 改 line / station / direction 就得；儲存後刷新頁面。
   * 核對：curl "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=ISL&sta=CEN&lang=TC"
   */
  mtr: [
    {
      label: '示範·港鐵中環',
      line: 'ISL', // 港島線
      station: 'CEN', // 中環
      stationNameTc: '中環',
      direction: 'BOTH', // UP=往柴灣方向、DOWN=往堅尼地城方向
    },
    {
      label: '示範·港鐵金鐘',
      line: 'TWL', // 荃灣線
      station: 'ADM', // 金鐘
      stationNameTc: '金鐘',
      direction: 'BOTH', // UP=往荃灣、DOWN=往中環
    },
  ],

  /**
   * 道路交通車速（運輸署交通偵測器 Raw Data）
   * 預設顯示屯門公路兩個方向；改 detectorIds 就得。
   * 位置表：traffic_speed_volume_occ_info.csv（Road_TC 含「屯門公路」）
   */
  traffic: [
    {
      label: '屯門公路',
      roadNameTc: '東行 · 往荃灣／九龍',
      note: '深井／汀九／轉乘站／麗城一帶偵測器平均',
      // 官方 detector_id（東行）：
      detectorIds: [
        'TDS91011', // 近深井 - 東行 (3)
        'TDS91010', // 近深井 - 東行 (2)
        'TDS91008', // 近汀九 - 東行 (5)
        'TDS91020', // 近屯門公路巴士轉乘站 - 東行 (1)
        'AID05201', // 近麗城花園一期停車場 - 東行
      ],
    },
    {
      label: '屯門公路',
      roadNameTc: '西行 · 往屯門',
      note: '深井／轉乘站／荃灣路一帶偵測器平均',
      // 官方 detector_id（西行）：
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
