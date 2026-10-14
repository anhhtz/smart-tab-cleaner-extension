/**
 * Storage Service & Rule Utilities
 * Hỗ trợ đồng bộ đa thiết bị qua chrome.storage.sync với fallback/migration từ chrome.storage.local
 */

const STORAGE_KEYS = {
  RULES: 'tab-closer',
  SETTINGS: 'tab-closer-settings',
  STATS: 'tab-closer-statistic'
};

const DEFAULT_SETTINGS = {
  defaultTimeout: 500, // mili-giây mặc định (500ms, rất tốt để dập tab quảng cáo tức thì)
  closeCurrentOnBlock: false
};

// 24 rules khôi phục trực tiếp từ LevelDB storage của extension gốc trên máy bạn
const INITIAL_RESTORED_RULES = {
  groups: [
    { id: "LAHCpZvFQLR4VBS3", name: "livecasino", matches: ["livecasino"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "T9KFmnf66qX48rmu", name: "uk88.baby", matches: ["uk88.baby"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "kaArqHQgek4r7Qx3", name: "lawandpolicyblog", matches: ["lawandpolicyblog"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "bhdsP1wmx8EGdxNL", name: "playkclub", matches: ["playkclub"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "DhBH75UBlo0uKlbF", name: "aliexpress", matches: ["aliexpress"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "b3U5LpNl1VwcdFus", name: "slowignition", matches: ["slowignition"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "ABNueIWN41ZS9qCB", name: "1xlite-4650", matches: ["1xlite-4650"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "Q1ntrgbRUe1mUUef", name: "wherewindsmeetgame", matches: ["wherewindsmeetgame"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "LTyPw12eNmHAs13u", name: "pagerrentablespotlight", matches: ["pagerrentablespotlight"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "RO9mrOzDqk7UbFzX", name: "myvccs", matches: ["myvccs"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "WIS26mJznXzb5Jm2", name: "dailyfaux", matches: ["dailyfaux"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "zn4IondWX6qUrJW4", name: "hai8g", matches: ["hai8g"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "opzizGLswidUCFZI", name: "frs2c", matches: ["frs2c"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "QPKdsKPgfh4BB9nx", name: "btse", matches: ["btse"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "dDTbtDb6Rlf6ekGs", name: "xmbrokervn", matches: ["xmbrokervn"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "miU4I2tkDaCW40t5", name: "ideasforafundate", matches: ["ideasforafundate"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "qrTsrFH29ihV8I2K", name: "dangkywinaz", matches: ["dangkywinaz"], excludeMatches: [], closeTimeout: 1, enabled: true },
    { id: "JgPQ4BSeEDRBWmdH", name: "hitclub", matches: ["hitclub"], excludeMatches: [], closeTimeout: 10, enabled: true },
    { id: "RPa7NSfc3KoBgoJo", name: "shop.tiktok", matches: ["shop.tiktok"], excludeMatches: [], closeTimeout: 10, enabled: true },
    { id: "zVLq38Kv8AN1G6E3", name: "yo88", matches: ["yo88"], excludeMatches: [], closeTimeout: 10, enabled: true },
    { id: "mkjvWhsXsYAIyLSR", name: "shopee", matches: ["shopee"], excludeMatches: [], closeTimeout: 10, enabled: true },
    { id: "cgGWdwwWc7fTtmXp", name: "magiamgia", matches: ["magiamgia."], excludeMatches: [], closeTimeout: 10, enabled: true },
    { id: "yk7QU6erWYi8ZnpF", name: "yo88", matches: ["yoo88"], excludeMatches: [], closeTimeout: 100, enabled: true },
    { id: "mKJolB2F4pUPpZho", name: "0.0.0.0:9001", matches: ["0.0.0.0:9001"], excludeMatches: [], closeTimeout: 10, enabled: true }
  ]
};

const StorageService = {
  /**
   * Đọc dữ liệu từ chrome.storage.sync, tự động fallback & migrate từ storage.local
   */
  async getRules() {
    let rules = null;

    // 1. Thử lấy từ chrome.storage.sync
    try {
      if (chrome.storage && chrome.storage.sync) {
        const syncData = await chrome.storage.sync.get([STORAGE_KEYS.RULES]);
        if (syncData && syncData[STORAGE_KEYS.RULES]) {
          const val = syncData[STORAGE_KEYS.RULES];
          rules = typeof val === 'string' ? JSON.parse(val) : val;
        }
      }
    } catch (err) {
      console.warn('Lỗi đọc storage.sync:', err);
    }

    // 2. Nếu sync chưa có dữ liệu, kiểm tra storage.local (Migration)
    if (!rules || !rules.groups || rules.groups.length === 0) {
      try {
        const localData = await chrome.storage.local.get([STORAGE_KEYS.RULES]);
        if (localData && localData[STORAGE_KEYS.RULES]) {
          const val = localData[STORAGE_KEYS.RULES];
          rules = typeof val === 'string' ? JSON.parse(val) : val;
        }
      } catch (err) {
        console.warn('Lỗi đọc storage.local:', err);
      }
    }

    // 3. Nếu cả sync và local đều chưa có dữ liệu (lần đầu cài mới), tự động nạp 24 rules khôi phục từ ext gốc
    if (!rules || !rules.groups || rules.groups.length === 0) {
      rules = JSON.parse(JSON.stringify(INITIAL_RESTORED_RULES));
      // Tự động đẩy lên sync và local để kích hoạt đồng bộ
      await this.saveRules(rules).catch((e) => console.warn('Lỗi lưu initial rules:', e));
    }

    return rules && Array.isArray(rules.groups) ? rules : { groups: [] };
  },

  /**
   * Lưu rules vào storage.sync và đồng thời lưu mirror vào local
   */
  async saveRules(data) {
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    const obj = { [STORAGE_KEYS.RULES]: payload };

    try {
      if (chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set(obj);
      }
    } catch (err) {
      console.warn('Không thể lưu vào sync, fallback sang local:', err);
    }

    try {
      await chrome.storage.local.set(obj);
    } catch (err) {
      console.error('Lỗi lưu local storage:', err);
    }
  },

  /**
   * Đọc cài đặt (Settings)
   */
  async getSettings() {
    let settings = null;
    try {
      if (chrome.storage && chrome.storage.sync) {
        const res = await chrome.storage.sync.get([STORAGE_KEYS.SETTINGS]);
        if (res && res[STORAGE_KEYS.SETTINGS]) {
          const val = res[STORAGE_KEYS.SETTINGS];
          settings = typeof val === 'string' ? JSON.parse(val) : val;
        }
      }
    } catch (e) {}

    if (!settings) {
      try {
        const localRes = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
        if (localRes && localRes[STORAGE_KEYS.SETTINGS]) {
          const val = localRes[STORAGE_KEYS.SETTINGS];
          settings = typeof val === 'string' ? JSON.parse(val) : val;
        }
      } catch (e) {}
    }

    return { ...DEFAULT_SETTINGS, ...(settings || {}) };
  },

  /**
   * Lưu cài đặt
   */
  async saveSettings(settings) {
    const payload = JSON.stringify(settings);
    const obj = { [STORAGE_KEYS.SETTINGS]: payload };
    try {
      if (chrome.storage && chrome.storage.sync) {
        await chrome.storage.sync.set(obj);
      }
    } catch (e) {}
    try {
      await chrome.storage.local.set(obj);
    } catch (e) {}
  },

  /**
   * Đọc thống kê tab đã đóng
   */
  async getStats() {
    try {
      const res = await chrome.storage.local.get([STORAGE_KEYS.STATS]);
      if (res && res[STORAGE_KEYS.STATS]) {
        const val = res[STORAGE_KEYS.STATS];
        return typeof val === 'string' ? JSON.parse(val) : val;
      }
    } catch (e) {}
    return { allClosed: 0 };
  },

  /**
   * Tăng biến đếm số tab đã đóng
   */
  async incrementClosedCount() {
    try {
      const stats = await this.getStats();
      stats.allClosed = (stats.allClosed || 0) + 1;
      await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: JSON.stringify(stats) });
      return stats.allClosed;
    } catch (e) {
      console.warn('Lỗi cập nhật thống kê:', e);
    }
  },

  /**
   * Thêm rule nhanh từ một URL
   */
  async addQuickRule(url, title, customTimeoutMs = null) {
    const settings = await this.getSettings();
    const timeoutMs = Math.max(0, Number(customTimeoutMs !== null ? customTimeoutMs : (settings.defaultTimeout || 500)));

    const patternInfo = this.extractSmartPattern(url);
    const rules = await this.getRules();

    // Kiểm tra xem rule đã tồn tại chưa
    const existingIndex = rules.groups.findIndex((g) =>
      g.matches.includes(patternInfo.pattern) || g.name === patternInfo.name
    );

    const newGroup = {
      id: 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: patternInfo.name || title || 'Auto Close Rule',
      matches: [patternInfo.pattern],
      excludeMatches: [],
      closeTimeout: timeoutMs,
      enabled: true,
      createdAt: Date.now()
    };

    if (existingIndex >= 0) {
      // Cập nhật lại timeout nếu đã có
      rules.groups[existingIndex].closeTimeout = timeoutMs;
      rules.groups[existingIndex].enabled = true;
    } else {
      rules.groups.unshift(newGroup);
    }

    await this.saveRules(rules);
    return newGroup;
  },

  /**
   * Xóa một rule theo ID
   */
  async removeRule(id) {
    const rules = await this.getRules();
    rules.groups = rules.groups.filter((g) => g.id !== id);
    await this.saveRules(rules);
  },

  /**
   * Bật/Tắt một rule
   */
  async toggleRule(id, enabled) {
    const rules = await this.getRules();
    const group = rules.groups.find((g) => g.id === id);
    if (group) {
      group.enabled = enabled;
      await this.saveRules(rules);
    }
  },

  /**
   * Bóc tách URL thông minh để sinh regex pattern an toàn & trực quan
   */
  extractSmartPattern(rawUrl) {
    try {
      const urlObj = new URL(rawUrl);
      const host = urlObj.hostname;
      const pathname = urlObj.pathname;

      // Danh sách các pattern phổ biến của launcher (Zoom, Teams, Telegram...)
      if (host.includes('zoom.us') && pathname.includes('/j/')) {
        return {
          name: 'Zoom Meeting Launcher',
          pattern: 'zoom\\.us/j/.*'
        };
      }
      if (host.includes('t.me')) {
        return {
          name: 'Telegram Join Link',
          pattern: 't\\.me/.*'
        };
      }
      if (host.includes('teams.microsoft.com') && (pathname.includes('/l/') || pathname.includes('/launcher/'))) {
        return {
          name: 'MS Teams Launcher',
          pattern: 'teams\\.microsoft\\.com/.*/launcher.*'
        };
      }
      if (host.includes('webex.com') && pathname.includes('/m/')) {
        return {
          name: 'Webex Meeting Launcher',
          pattern: 'webex\\.com/m/.*'
        };
      }

      // Mặc định: Trích xuất tên miền chính và escape các ký tự đặc biệt
      // Ví dụ: sub.domain.com -> domain\.com hoặc host đầy đủ
      const escapedHost = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return {
        name: host,
        pattern: escapedHost
      };
    } catch (e) {
      // Nếu URL không parse được, escape thô
      const escaped = rawUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return {
        name: 'Custom URL',
        pattern: escaped
      };
    }
  },

  /**
   * Kiểm tra xem 1 URL có khớp với bất kỳ rule nào đang bật không
   */
  findMatchedGroup(url, groups) {
    if (!url || !groups || !Array.isArray(groups)) return null;

    const testPattern = (pattern) => {
      try {
        return new RegExp(pattern, 'i').test(url);
      } catch (err) {
        return false;
      }
    };

    return groups.find((group) => {
      // Nếu rule bị tắt thì bỏ qua
      if (group.enabled === false) return false;

      const hasMatch = (group.matches || []).some(testPattern);
      const hasExclude = (group.excludeMatches || []).some(testPattern);
      return hasMatch && !hasExclude;
    });
  }
};

// Xuất ra môi trường global để dùng cho cả Service Worker và Popup
if (typeof self !== 'undefined') {
  self.StorageService = StorageService;
  self.STORAGE_KEYS = STORAGE_KEYS;
  self.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
}
