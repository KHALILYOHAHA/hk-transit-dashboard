# 香港交通 · 天氣看板 / HK Transit + Weather Dashboard

個人用靜態網頁：顯示**香港天氣**（現況、短提示、未來 7 天預報）＋**九巴實時到站 ETA**＋**港鐵 Next Train**＋**屯門市中心 ↔ 圓方、圓方 ↔ 黃大仙**四段道路車速。手機優先、深色主題、約每 1 分鐘自動刷新。

## 點開 / How to open

```bash
cd /workspace/hk-transit-dashboard
python3 server.py
# 或：python3 -m http.server 8765 --bind 127.0.0.1
```

然後用瀏覽器打開：

**http://127.0.0.1:8765/**

> KMB（`data.etabus.gov.hk`）、天文台、港鐵 Next Train（`rt.data.gov.hk`）、同運輸署交通偵測器（`resource.data.one.gov.hk`）都容許瀏覽器 CORS（`Access-Control-Allow-Origin: *`），所以一般**唔使 proxy**。  
> 如果日後 CORS 有問題，可以用 `server.py` 嘅白名單 `/proxy?url=...`（已包含 `rt.data.gov.hk`、`resource.data.one.gov.hk`）。

### （可選）CORS proxy

```bash
cd /workspace/hk-transit-dashboard
python3 server.py
# 預設 http://127.0.0.1:8765/ ，並提供 /proxy?url=...
```


## 搵巴士路線 / Look up any bus route

道路交通下面、「公共交通 ETA」前面嘅「**搵巴士路線**」可以輸入路線號碼（例如 `258D`、`1A`、`969`、`960`）即時查站序同到站時間，**唔使改 `config.js`**。固定三欄 ETA 同道路交通唔會被搜尋覆蓋。

用法：

1. 輸入路線，撳「搵」或按 Enter（唔會喺打字途中不斷拉 API）。
2. 如果九巴／龍運同城巴都有呢條線，用分段掣揀公司。
3. 揀方向（起點 → 終點；特別班次會標示服務類型）。
4. 喺站列表撳一個站，就會顯示該站該線嘅實時 ETA（約每 1 分鐘同固定欄一齊刷新）。
5. 可撳「針選此站」記住呢次查詢（存喺瀏覽器 `localStorage`，刷新後會還原）。**唔會自動改 `config.js` 嘅固定欄。**

資料來源：九巴／龍運 `data.etabus.gov.hk`、城巴 `rt.data.gov.hk` 公開 API。

## 點改站 / Change stops & routes

編輯 **`config.js`**，儲存後刷新頁面。

### 巴士 `stops`

```js
{
  label: '示範·九巴1A',
  company: 'kmb',
  route: '1A',
  stopId: 'CC811B604DD883AE',
  stopNameTc: '德福花園',
  serviceType: 1,
  bound: 'O',  // O=去程 outbound, I=回程 inbound
}
```

#### 點搵真實 stopId

1. **路線站序**（`outbound` / `inbound`，唔係 `O`/`I`）：  
   `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/{route}/{outbound|inbound}/{serviceType}`  
   例：`.../route-stop/1A/outbound/1`
2. **站名**：  
   `https://data.etabus.gov.hk/v1/transport/kmb/stop/{stopId}`
3. **核對 ETA**：  
   `https://data.etabus.gov.hk/v1/transport/kmb/eta/{stopId}/{route}/{serviceType}`


天氣卡會按同一組天文台（或備援 Open-Meteo）數據，在濕度／紫外線下方顯示 1–3 條短提示，例如落雨「拎遮」「小心路滑」、天冷「著多件衫」、炎熱或高紫外線「飲多啲水」「塗防曬」；無特別情況則「天氣清爽，適合輕裝」。提示下面係未來 7 天天氣：天文台 9 天天氣預報（`dataType=fnd`）取頭 7 日，含圖示、最高／最低氣溫、顯著降雨概率（PSR）；若 7 日預報失敗則改用 Open-Meteo daily，並標示來源。

### 道路交通 `traffic`（四段走廊）

```js
{
  label: '屯門市中心 → 圓方',
  roadNameTc: '東行 · 往圓方／九龍',
  note: '市中心皇珠路／置樂、轉乘站、深井、荃灣路至西九龍公路一帶偵測器平均',
  detectorIds: ['TDSLFR10003', 'TDS91032', 'TDS91020', 'TDS91011', 'AID05203', 'AID03211'],
}
```

#### 資料來源（官方開放數據）

| 項目 | URL |
|------|-----|
| 實時車速 Raw XML（約每 1 分鐘） | `https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml` |
| 偵測器位置 CSV（搵 `detectorId`） | `https://static.data.gov.hk/td/traffic-data-strategic-major-roads/info/traffic_speed_volume_occ_info.csv` |
| 規格 PDF | `https://static.data.gov.hk/td/traffic-data-strategic-major-roads/dataspec/dataspec-traffic-data-strategic-major-roads.pdf` |
| data.gov.hk 資料集 | Traffic Data of Strategic / Major Roads（`hk-td-sm_4`） |

預設四個路段（頁面 2×2 排列；電話直向單欄）：

| 標籤 | 方向 | detectorIds |
|------|------|-------------|
| 屯門市中心 → 圓方 | 東行 · 往圓方／九龍 | `TDSLFR10003` `TDS91032` `TDS91020` `TDS91011` `AID05203` `AID03211` |
| 圓方 → 黃大仙 | 北行／東行 · 往黃大仙 | `AID03106` `AID03111` `AID07201` `AID07205` `AID07210` `AID07214` |
| 黃大仙 → 圓方 | 西行／南行 · 往圓方 | `AID07119` `AID07126` `AID07133` `AID03204` `AID03208` `AID03211` |
| 圓方 → 屯門市中心 | 西行 · 往屯門市中心 | `AID03106` `AID03111` `AID05133` `TDS90027` `TDS90036` `TDSLFR20002` |

走廊：屯門市中心沿皇珠路入屯門公路，經荃灣路／青葵公路至西九龍公路近圓方；圓方往黃大仙沿西九龍公路北行，再經呈祥道、龍翔道（七號幹道）。官方位置圖無「連翔道」同青葵公路北行偵測器；`TDS90026`、`AID03114`、`AID03203` 間中缺數，改用同向鄰近站。

頁面會對每個 `detectorId` 取 **valid=Y** 且合理範圍（1–130 km/h）嘅車道平均，再對該路段所有命中偵測器再平均；**唔會虛構車速**。  
車況標籤（暢通／緩慢／擠塞）只係 UI 顏色，閾值：≥60／≥40／&lt;40 km/h。四格車速卡之間用 24px（電話直向）／28px（2×2）空隙分開，並收細卡片陰影，避免空隙被陰影食掉。

四格下面係「**交通消息**」，來源係運輸署官方「特別交通消息（第二代）」繁中 XML：  
`https://www.td.gov.hk/tc/special_news/trafficnews.xml`（data.gov.hk 資料集 `hk-td-tis_19-special-traffic-news-v2`，實時；CDN 約 5 分鐘快取，頁面隨 60 秒刷新）。  
**只顯示道路事故**（`交通意外`／`Traffic Accident`；標題「道路事故」且詳情屬意外者）。與四段走廊相關嘅事故會排前並標「沿線」。工程、交通安排、其他特別消息唔會列出。無事故時顯示「暫時未有道路事故」，**唔會虛構事故**。

核對：

```bash
curl -sL "https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml" | rg "TDSLFR10003|AID03211|AID07214|TDS90027"
```

> 備註：Journey Time Indicator（JTI v2，`SJ5` 屯門公路近井財街）XML 喺 `static.data.gov.hk`；本機／部分網絡可能 403。本看板改用已驗證可 curl 嘅偵測器 Raw 車速。

### 港鐵 `mtr`

```js
{
  label: '示範·港鐵中環',
  line: 'ISL',      // 線碼：ISL 港島、TWL 荃灣、KTL 觀塘…
  station: 'CEN',   // 站碼：CEN 中環、ADM 金鐘…
  stationNameTc: '中環',
  direction: 'BOTH', // 'UP' | 'DOWN' | 'BOTH'
}
```

#### 點搵／核對線碼 + 站碼

- **API**（免註冊、免 key）：  
  `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line={LINE}&sta={STA}&lang=TC`
- **規格 PDF**：https://opendata.mtr.com.hk/doc/Next_Train_API_Spec_v1.7.pdf  
- **data.gov.hk**：Real-time MTR train information（MTR Corporation）

例：

```bash
curl "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=ISL&sta=CEN&lang=TC"
curl "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=TWL&sta=ADM&lang=TC"
```

回傳 `data["{LINE}-{STA}"].UP` / `.DOWN` 各最多約 4 班；欄位包括 `ttnt`（約幾分鐘）、`time`、`dest`（目的地站碼）、`plat`。  
`status: 0` 時係特別服務安排／暫停，頁面會顯示官方訊息，**唔會虛構班次**。

支援線：AEL、TCL、TML、TKL、EAL、SIL、TWL、ISL、KTL、DRL。

## 用邊啲 API / Data sources

| 用途 | 來源 | URL |
|------|------|-----|
| 天氣（現況） | 香港天文台開放數據（預設） | `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc` |
| 天氣（未來 7 天） | 天文台 9 天天氣預報（取頭 7 日） | `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=tc` |
| 天氣備援 | Open-Meteo（config 可切） | `https://api.open-meteo.com/v1/forecast?...` |
| 巴士 ETA | 九巴／龍運 Open Data | `https://data.etabus.gov.hk/v1/transport/kmb/...` |
| 港鐵班次 | MTR Next Train（data.gov.hk） | `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?...` |
| 道路車速 | 運輸署主要幹道交通偵測器 Raw | `https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml` |
| 交通消息 | 運輸署特別交通消息（第二代）繁中 XML | `https://www.td.gov.hk/tc/special_news/trafficnews.xml` |

全部係官方／公開 API，無爬私人 App，**港鐵唔使 API key**。

## 示範組合（已核對有數據）

| 標籤 | 類型 | 代碼 | 備註 |
|------|------|------|------|
| 示範·九巴1A | 巴士 | 1A / `CC811B604DD883AE` | O → 尖沙咀碼頭 · 德福花園 |
| 示範·九巴104 | 巴士 | 104 / `010D8E1BE34538EE` | O → 深水埗 · 堅尼地城巴士總站 |
| 示範·港鐵中環 | 港鐵 | ISL / CEN | 港島線 · 中環 |
| 示範·港鐵金鐘 | 港鐵 | TWL / ADM | 荃灣線 · 金鐘 |
| 屯門市中心 → 圓方 | 道路 | 東行 detectorIds | 皇珠路／屯門公路／荃灣路／西九龍公路 |
| 圓方 → 黃大仙 | 道路 | 北行／東行 detectorIds | 西九龍公路／呈祥道／龍翔道 |
| 黃大仙 → 圓方 | 道路 | 西行／南行 detectorIds | 龍翔道／呈祥道／西九龍公路 |
| 圓方 → 屯門市中心 | 道路 | 西行 detectorIds | 西九龍公路／荃灣路／屯門公路／皇珠路 |

## 檔案

```
/workspace/hk-transit-dashboard/
  index.html    # 單頁 UI（天氣 + 道路 + 港鐵 + 巴士 + 路線搜尋）
  styles.css    # 手機優先深色樣式
  app.js        # 拉天氣 + 道路車速 + 巴士／港鐵 ETA、路線搜尋、倒數、刷新
  config.js     # ← 固定欄改呢度（transit + traffic）；搜尋唔使改呢度
  server.py     # （可選）靜態檔 + 白名單 proxy
  README.md
```

## 注意

- ETA／班次可能喺非服務時間係空；頁面會顯示「暫時未有到站時間／班次」。
- 數據僅供個人參考，請以現場／官方 App 為準。
