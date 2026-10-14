/**
 * Background Service Worker - Tabs Auto Close & Blocker
 * Lắng nghe các sự kiện tab và tự động đóng tab theo quy tắc đã được đồng bộ
 */

importScripts('storage.js');

const activeTimers = new Map();
const ICONS = {
  DEFAULT: '/icons/icon128.png',
  TIMER: '/icons/icon128timer.png'
};

// Xử lý khi tab được cập nhật URL hoặc tải xong
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Chỉ xử lý khi tab đã load hoàn tất và có URL hợp lệ
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }

  // Bỏ qua các trang nội bộ của trình duyệt
  if (
    tab.url.startsWith('chrome://') ||
    tab.url.startsWith('chrome-extension://') ||
    tab.url.startsWith('edge://') ||
    tab.url.startsWith('about:')
  ) {
    return;
  }

  try {
    const rules = await StorageService.getRules();
    const settings = await StorageService.getSettings();
    const matchedGroup = StorageService.findMatchedGroup(tab.url, rules.groups);

    if (matchedGroup) {
      // Đổi icon sang trạng thái đang đếm ngược
      try {
        await chrome.action.setIcon({ tabId: tabId, path: ICONS.TIMER });
      } catch (e) {}

      // Xóa timer cũ nếu đang chạy trên tab này
      if (activeTimers.has(tabId)) {
        clearTimeout(activeTimers.get(tabId));
        activeTimers.delete(tabId);
      }

      // Xác định thời gian chờ (mili-giây)
      const delayMs = typeof matchedGroup.closeTimeout === 'number'
        ? matchedGroup.closeTimeout
        : (settings.defaultTimeout || 500);

      // Kích hoạt bộ đếm đóng tab
      const timerId = setTimeout(async () => {
        try {
          await chrome.tabs.remove(tabId);
          await StorageService.incrementClosedCount();
        } catch (err) {
          console.warn(`[Auto-Close] Không thể đóng tab ${tabId} (có thể tab đã tắt thủ công):`, err);
        } finally {
          activeTimers.delete(tabId);
        }
      }, delayMs);

      activeTimers.set(tabId, timerId);
    } else {
      // Nếu URL đã đổi sang trang không khớp rule, hủy timer nếu có
      if (activeTimers.has(tabId)) {
        clearTimeout(activeTimers.get(tabId));
        activeTimers.delete(tabId);
        try {
          await chrome.action.setIcon({ tabId: tabId, path: ICONS.DEFAULT });
        } catch (e) {}
      }
    }
  } catch (error) {
    console.error('[Auto-Close Background Error]:', error);
  }
});

// Dọn dẹp timer khi tab bị đóng thủ công
chrome.tabs.onRemoved.addListener((tabId) => {
  if (activeTimers.has(tabId)) {
    clearTimeout(activeTimers.get(tabId));
    activeTimers.delete(tabId);
  }
});

// Khởi tạo & kiểm tra migration khi cài đặt hoặc khởi động extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Tabs Auto Close] Extension đã được khởi chạy với Cloud Sync.');
  await StorageService.getRules(); // Kích hoạt auto-migrate từ local sang sync
});