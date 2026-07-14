# 摩斯外賣銷售記錄 — 建置與安裝指南

對象：沒有 Android 開發背景的使用者。

---

## 一、需要先安裝的工具

### 1. Node.js（若尚未安裝）
- 下載：https://nodejs.org/ → 選 LTS 版
- 安裝後在終端機執行 `node -v` 確認版本 ≥ 18

### 2. Android Studio（最重要，包含 JDK 和 Android SDK）
- 下載：https://developer.android.com/studio
- 安裝時保留預設選項（會一起裝好 SDK 和模擬器）
- 安裝完成後**至少開啟一次 Android Studio**，讓它完成 SDK 初始化
- 確認 SDK 路徑：Android Studio → Settings → Android SDK → SDK 路徑記下來
  （通常是 `C:\Users\你的帳號\AppData\Local\Android\Sdk`）
C:\Users\Sydney\AppData\Local\Android\Sdk
---

## 二、環境變數設定（只需做一次）

Android Studio 安裝好之後，要讓終端機也找得到 Java 和 Android SDK：

1. 開啟「進階系統設定」→「環境變數」
2. 在「系統變數」新增：
   - **JAVA_HOME** → `C:\Program Files\Android\Android Studio\jbr`
   - **ANDROID_HOME** → `C:\Users\你的帳號\AppData\Local\Android\Sdk`
3. 在「系統變數」的 **Path** 裡新增兩行：
   - `%JAVA_HOME%\bin`
   - `%ANDROID_HOME%\platform-tools`
4. 開新的 PowerShell 視窗，執行 `java -version`，出現版本號就代表設定成功

---

## 三、從零到 APK 的完整指令步驟

在專案根目錄（`D:\mos-sales-app`）開 PowerShell 執行：

```powershell
# 步驟 1：安裝 npm 套件（第一次或 node_modules 不存在時才需要）
npm install

# 步驟 2：建置網頁版並同步到 Android 專案
npm run cap:sync

# 步驟 3：進入 Android 目錄，打包 debug APK
cd android
.\gradlew.bat assembleDebug
```

完整流程大約需要 3–10 分鐘（第一次 Gradle 會下載依賴，比較久）。

---

## 四、APK 檔案位置

打包成功後，APK 在這裡：

```
D:\mos-sales-app\android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 五、把 APK 安裝到 Samsung 手機

### 5-1. 手機端：開啟「允許安裝未知來源」

Samsung Android 12 以上的路徑：
1. 設定 → 生物辨識和安全性 → 安裝未知應用程式
2. 找到你要用來安裝的傳輸方式（例如「我的檔案」或「Chrome」），開啟「允許」

舊版 Android（8–11）：
- 設定 → 應用程式 → 右上角「⋮」→ 特殊存取 → 安裝未知應用程式

### 5-2. 傳輸 APK 到手機（擇一）

**方法 A：USB 傳輸**
1. 手機連接電腦 USB，選擇「傳輸檔案（MTP）」模式
2. 把 `app-debug.apk` 複製到手機的「下載」資料夾
3. 在手機用「我的檔案」找到 APK，點開安裝

**方法 B：Google 雲端硬碟**
1. 把 `app-debug.apk` 上傳到 Google Drive
2. 在手機 Google Drive App 開啟該檔案 → 點「下載」
3. 下載完成後點通知 → 安裝

**方法 C：LINE / Email 傳送給自己**
- 把 APK 當附件傳給自己，在手機點開附件安裝

---

## 六、常見問題

### Q1：`JAVA_HOME is not set` 錯誤
原因：環境變數沒設定，或設定後沒有重新開終端機。
解法：
1. 確認 Android Studio 有安裝完成
2. 重新設定環境變數（見第二節）
3. **關掉所有 PowerShell / 終端機視窗**，重新開一個再試

### Q2：Gradle 下載超慢或卡住
原因：第一次執行 `gradlew` 會從網路下載 Gradle 本體（約 100MB）。
解法：確保網路暢通，等它跑完即可（通常 3–5 分鐘）。若一直失敗可嘗試開 VPN。

### Q3：USB 連接後電腦看不到手機
原因：Samsung 手機預設 USB 模式可能是「充電」。
解法：
1. 手機連 USB 後，下拉通知列找「USB 偏好設定」
2. 選「傳輸檔案」（MTP）
3. 若第一次連線，手機會跳出「允許 USB 偵錯」或「信任這台電腦」，選允許

### Q4：安裝時出現「解析套件時發生問題」
原因：APK 損毀或傳輸不完整。
解法：重新傳輸 APK 再試，確認檔案大小和原始檔一致。

---

## 七、日常更新 App 的流程

程式碼改好後，只需重複步驟 2–3：

```powershell
# 在 D:\mos-sales-app 執行
npm run cap:sync
cd android
.\gradlew.bat assembleDebug
```

產出新的 `app-debug.apk` 後，覆蓋安裝到手機（資料不會被清除）。
