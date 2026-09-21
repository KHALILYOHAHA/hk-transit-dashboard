# 香港交通 · 天氣看板 / HK Transit + Weather Dashboard

個人用靜態網頁：顯示**香港天氣**＋**九巴實時到站 ETA**＋**港鐵 Next Train**＋**屯門公路交通車速**。手機優先、深色主題、約每 45 秒自動刷新。

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


### 道路交通 `traffic`（屯門公路）

```js
{
  label: '屯門公路',
  roadNameTc: '東行 · 往荃灣／九龍',
  note: '深井／汀九／轉乘站／麗城一帶偵測器平均',
  detectorIds: ['TDS91011', 'TDS91010', 'TDS91008', 'TDS91020', 'AID05201'],
}
```

#### 資料來源（官方開放數據）

| 項目 | URL |
|------|-----|
| 實時車速 Raw XML（約每 1 分鐘） | `https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml` |
| 偵測器位置 CSV（搵 `detectorId`） | `https://static.data.gov.hk/td/traffic-data-strategic-major-roads/info/traffic_speed_volume_occ_info.csv` |
| 規格 PDF | `https://static.data.gov.hk/td/traffic-data-strategic-major-roads/dataspec/dataspec-traffic-data-strategic-major-roads.pdf` |
| data.gov.hk 資料集 | Traffic Data of Strategic / Major Roads（`hk-td-sm_4`） |

預設兩個路段：

| 標籤 | 方向 | detectorIds |
|------|------|-------------|
| 屯門公路 | 東行 · 往荃灣／九龍 | `TDS91011` `TDS91010` `TDS91008` `TDS91020` `AID05201` |
| 屯門公路 | 西行 · 往屯門 | `TDS90027` `TDS90026` `TDS90036` `TDS90037` `TDS90016` |

頁面會對每個 `detectorId` 取 **valid=Y** 且合理範圍（1–130 km/h）嘅車道平均，再對該路段所有命中偵測器再平均；**唔會虛構車速**。  
車況標籤（暢通／緩慢／擠塞）只係 UI 顏色，閾值：≥60／≥40／&lt;40 km/h。

核對：

```bash
curl -sL "https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml" | rg "TDS91011|TDS90027"
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
| 天氣 | 香港天文台開放數據（預設） | `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc` |
| 天氣備援 | Open-Meteo（config 可切） | `https://api.open-meteo.com/v1/forecast?...` |
| 巴士 ETA | 九巴／龍運 Open Data | `https://data.etabus.gov.hk/v1/transport/kmb/...` |
| 港鐵班次 | MTR Next Train（data.gov.hk） | `https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?...` |
| 道路車速 | 運輸署主要幹道交通偵測器 Raw | `https://resource.data.one.gov.hk/td/traffic-detectors/rawSpeedVol-all.xml` |

全部係官方／公開 API，無爬私人 App，**港鐵唔使 API key**。

## 示範組合（已核對有數據）

| 標籤 | 類型 | 代碼 | 備註 |
|------|------|------|------|
| 示範·九巴1A | 巴士 | 1A / `CC811B604DD883AE` | O → 尖沙咀碼頭 · 德福花園 |
| 示範·九巴104 | 巴士 | 104 / `010D8E1BE34538EE` | O → 深水埗 · 堅尼地城巴士總站 |
| 示範·港鐵中環 | 港鐵 | ISL / CEN | 港島線 · 中環 |
| 示範·港鐵金鐘 | 港鐵 | TWL / ADM | 荃灣線 · 金鐘 |
| 屯門公路 | 道路 | 東行 detectorIds | 往荃灣／九龍 · Raw 車速平均 |
| 屯門公路 | 道路 | 西行 detectorIds | 往屯門 · Raw 車速平均 |

## 檔案

```
/workspace/hk-transit-dashboard/
  index.html    # 單頁 UI（天氣 + 道路 + 港鐵 + 巴士）
  styles.css    # 手機優先深色樣式
  app.js        # 拉天氣 + 道路車速 + 巴士 ETA + 港鐵班次、倒數、刷新
  config.js     # ← 你改呢度（stops + mtr + traffic）
  server.py     # （可選）靜態檔 + 白名單 proxy
  README.md
```

## 注意

- ETA／班次可能喺非服務時間係空；頁面會顯示「暫時未有到站時間／班次」。
- 數據僅供個人參考，請以現場／官方 App 為準。
