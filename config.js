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
};
