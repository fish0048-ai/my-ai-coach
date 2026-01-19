# Firebase 雲端同步審視報告

## 📋 審視日期
2024-12-19

## ✅ 目前做得好的部分

### 1. 實時監聽（onSnapshot）的使用
以下服務已正確使用實時監聽：
- ✅ `bodyService.js` - `subscribeBodyLogs()` 
- ✅ `achievementService.js` - `subscribeAchievements()`
- ✅ `calendarService.js` - `subscribeCompletedWorkouts()`, `subscribeGears()`
- ✅ `nutritionService.js` - `subscribeFoodLogsByDate()`

### 2. 寫入操作
- ✅ 所有寫入操作（`setDoc`, `updateDoc`, `addDoc`, `deleteDoc`）都正確使用
- ✅ 使用 `serverTimestamp()` 確保時間戳一致性
- ✅ 寫入後有清除快取的邏輯

## ⚠️ 發現的問題

### 🔴 問題 1：沒有啟用離線持久化（最嚴重）

**現況**：
- `firebase.js` 中沒有啟用 `enableIndexedDbPersistence`
- 離線時無法讀取快取的資料
- 離線時寫入會直接失敗，不會排隊等待網路恢復

**影響**：
- 用戶在離線狀態下無法查看歷史資料
- 離線時的操作會失敗，資料可能遺失
- 不符合 PWA 的離線體驗標準

**建議修復**：
```javascript
// src/firebase.js
import { enableIndexedDbPersistence } from 'firebase/firestore';

try {
  await enableIndexedDbPersistence(db);
  console.log('Firebase 離線持久化已啟用');
} catch (err) {
  if (err.code === 'failed-precondition') {
    console.warn('多個分頁開啟，離線持久化僅在一個分頁中啟用');
  } else if (err.code === 'unimplemented') {
    console.warn('瀏覽器不支援離線持久化');
  }
}
```

---

### 🟡 問題 2：混合使用實時監聽和一次性查詢

**現況**：
- 部分功能使用 `onSnapshot`（實時同步）
- 部分功能使用 `getDocs`（一次性查詢，不會自動更新）

**具體問題**：

| 服務 | 函數 | 目前方式 | 問題 |
|------|------|---------|------|
| `calendarService.js` | `listCalendarWorkouts()` | `getDocs` | 資料更新後不會自動同步 |
| `calendarService.js` | `listGears()` | `getDocs` | 裝備更新後不會自動同步 |
| `userService.js` | `getUserProfile()` | `getDoc` | Profile 更新後不會自動同步 |
| `calendarService.js` | `getUserProfile()` | `getDoc` | 重複實作，且無實時監聽 |

**影響**：
- 用戶在多個分頁操作時，資料不會即時同步
- 需要手動重新整理才能看到最新資料
- 用戶體驗不一致

**建議修復**：
1. 為 `getUserProfile` 新增實時監聽版本：`subscribeUserProfile(callback)`
2. 將 `listCalendarWorkouts` 改為實時監聽版本（或提供訂閱版本）
3. 將 `listGears` 改為使用現有的 `subscribeGears`（已有實作）

---

### 🟡 問題 3：快取策略可能導致資料不一致

**現況**：
- `calendarService.js` 使用記憶體快取（5分鐘 TTL）
- 寫入後會清除快取，但讀取時仍可能拿到舊資料

**問題場景**：
1. 用戶在分頁 A 更新資料 → 清除快取
2. 用戶在分頁 B 讀取資料 → 可能拿到快取中的舊資料（如果快取未過期）
3. 即使使用 `onSnapshot`，快取仍可能干擾

**建議修復**：
- 如果使用實時監聽，應該移除記憶體快取（`onSnapshot` 本身就有快取機制）
- 或者改用 Firestore 的離線快取（透過 `enableIndexedDbPersistence`）

---

### 🟡 問題 4：User Profile 沒有實時監聽

**現況**：
- `userStore.js` 在初始化時使用 `getUserProfile()`（一次性查詢）
- Profile 更新後，其他分頁不會自動更新

**影響**：
- 用戶在 Profile 頁面更新資料後，Dashboard 不會即時反映
- 需要手動重新整理或重新登入

**建議修復**：
在 `userService.js` 新增：
```javascript
export const subscribeUserProfile = (callback) => {
  const user = getCurrentUser();
  if (!user) {
    callback(null);
    return () => {};
  }
  const profileRef = doc(db, 'users', user.uid);
  return onSnapshot(profileRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() : null);
  });
};
```

然後在 `userStore.js` 中使用實時監聽取代一次性查詢。

---

### 🟢 問題 5：沒有處理網路狀態

**現況**：
- 沒有監聽網路狀態變化
- 沒有提示用戶目前是離線狀態
- 沒有處理離線寫入的排隊狀態

**建議修復**：
```javascript
// src/services/networkService.js
import { onDisconnect, onConnect } from 'firebase/database';
// 或使用 navigator.onLine API

export const subscribeNetworkStatus = (callback) => {
  const handleOnline = () => callback({ online: true });
  const handleOffline = () => callback({ online: false });
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // 初始狀態
  callback({ online: navigator.onLine });
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};
```

---

## 📊 改進優先級

| 優先級 | 問題 | 影響範圍 | 修復難度 | 建議完成時間 |
|--------|------|---------|---------|-------------|
| 🔴 P0 | 啟用離線持久化 | 全應用 | 低 | 立即 |
| 🟡 P1 | User Profile 實時監聽 | 用戶資料同步 | 中 | 本週 |
| 🟡 P1 | Calendar/Gears 改用實時監聽 | 資料同步 | 中 | 本週 |
| 🟢 P2 | 移除記憶體快取（改用 Firestore 快取） | 資料一致性 | 中 | 下週 |
| 🟢 P2 | 網路狀態監聽 | 用戶體驗 | 低 | 下週 |

---

## 🔧 建議的改進步驟

### 步驟 1：啟用離線持久化（立即執行）
修改 `src/firebase.js`，加入離線持久化支援。

### 步驟 2：統一使用實時監聽
- 將 `getUserProfile` 改為 `subscribeUserProfile`
- 將 `listCalendarWorkouts` 改為使用 `subscribeCalendarWorkouts`（需新增）
- 將 `listGears` 改為使用現有的 `subscribeGears`

### 步驟 3：移除記憶體快取
- 移除 `calendarService.js` 中的記憶體快取邏輯
- 依賴 Firestore 的離線快取機制

### 步驟 4：加入網路狀態監聽
- 新增 `networkService.js`
- 在 UI 中顯示離線/線上狀態

---

## 📝 注意事項

1. **多分頁限制**：`enableIndexedDbPersistence` 只能在一個分頁中啟用，需要處理錯誤情況
2. **效能考量**：實時監聽會持續連線，需要確保在組件卸載時正確取消訂閱
3. **資料一致性**：移除記憶體快取後，所有資料都依賴 Firestore 的單一真實來源
4. **向後相容**：改動時需要確保現有功能不受影響

---

## ✅ 驗證清單

改進完成後，請驗證：
- [x] 離線時可以讀取歷史資料（已啟用離線持久化）
- [x] 離線時的寫入操作會排隊，網路恢復後自動同步（已啟用離線持久化）
- [x] Profile 更新後，所有分頁即時反映（已改用實時監聽）
- [ ] 多分頁操作時，資料會即時同步（Calendar/Gears 仍需改用實時監聽）
- [ ] 網路狀態變化時，UI 有適當提示（待實作）
- [ ] 沒有記憶體洩漏（所有訂閱都有正確取消）

---

## 🎉 已完成的改進（2024-12-19）

### ✅ P0：啟用離線持久化
- **檔案**：`src/firebase.js`
- **變更**：加入 `enableIndexedDbPersistence` 啟用離線快取
- **效果**：離線時可讀取歷史資料，離線寫入會自動排隊

### ✅ P1：User Profile 實時監聽
- **檔案**：`src/services/userService.js`, `src/store/userStore.js`
- **變更**：
  - 新增 `subscribeUserProfile()` 實時監聽函數
  - `userStore.js` 改用實時監聽取代一次性查詢
- **效果**：Profile 更新後，所有分頁即時同步

---

## 📋 待完成的改進

### 🟡 P1：Calendar/Gears 改用實時監聽
- 將 `listCalendarWorkouts()` 改為使用實時監聽版本
- 將 `listGears()` 改為使用現有的 `subscribeGears()`

### 🟢 P2：移除記憶體快取
- 移除 `calendarService.js` 中的記憶體快取邏輯
- 依賴 Firestore 的離線快取機制

### 🟢 P2：網路狀態監聽
- 新增 `networkService.js`
- 在 UI 中顯示離線/線上狀態
