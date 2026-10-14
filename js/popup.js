/**
 * Popup UI Logic - Tabs Auto Close & Quick Blocker
 * Quản lý giao diện: Duyệt tab/Lịch sử, Quick Block, Test Regex, Đồng bộ & Cài đặt
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const navTabs = document.querySelectorAll('.nav-tab-btn');
  const tabViews = document.querySelectorAll('.tab-view');
  const rulesCountBadge = document.getElementById('rulesCountBadge');
  const openTabsCount = document.getElementById('openTabsCount');

  // Browse Tab Elements
  const searchInput = document.getElementById('searchInput');
  const btnFilterOpenTabs = document.getElementById('btnFilterOpenTabs');
  const btnFilterHistory = document.getElementById('btnFilterHistory');
  const siteListContainer = document.getElementById('siteListContainer');

  // Rules Tab Elements
  const testerInput = document.getElementById('testerInput');
  const testerResult = document.getElementById('testerResult');
  const rulesListContainer = document.getElementById('rulesListContainer');
  const btnManualAddRule = document.getElementById('btnManualAddRule');

  // Settings Tab Elements
  const settingDefaultTimeout = document.getElementById('settingDefaultTimeout');
  const settingCloseOnBlock = document.getElementById('settingCloseOnBlock');
  const statClosedCount = document.getElementById('statClosedCount');
  const btnExportRules = document.getElementById('btnExportRules');
  const btnImportRules = document.getElementById('btnImportRules');
  const importFileInput = document.getElementById('importFileInput');
  const toastNotice = document.getElementById('toastNotice');

  // State
  let currentBrowseMode = 'openTabs'; // 'openTabs' | 'history'
  let cachedRules = { groups: [] };
  let cachedSettings = { defaultTimeout: 3, closeCurrentOnBlock: false };
  let openTabsList = [];
  let historyList = [];

  // ====================== 1. Khởi tạo & Tab Navigation ======================
  async function init() {
    cachedSettings = await StorageService.getSettings();
    cachedRules = await StorageService.getRules();

    // Cập nhật giá trị vào Settings form
    settingDefaultTimeout.value = cachedSettings.defaultTimeout || 3;
    settingCloseOnBlock.checked = Boolean(cachedSettings.closeCurrentOnBlock);

    // Cập nhật thống kê
    const stats = await StorageService.getStats();
    statClosedCount.textContent = stats.allClosed || 0;

    // Cập nhật badge
    updateRulesCountBadge();

    // Mặc định load Open Tabs
    await loadOpenTabs();
  }

  function updateRulesCountBadge() {
    rulesCountBadge.textContent = cachedRules.groups ? cachedRules.groups.length : 0;
  }

  navTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      navTabs.forEach((b) => b.classList.remove('active'));
      tabViews.forEach((v) => (v.style.display = 'none'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetView = document.getElementById(targetId);
      if (targetView) targetView.style.display = 'block';

      if (targetId === 'rulesTab') {
        renderRulesList();
      } else if (targetId === 'browseTab') {
        if (currentBrowseMode === 'openTabs') loadOpenTabs();
        else loadHistory();
      }
    });
  });

  // Filter: Tab đang mở vs Lịch sử
  btnFilterOpenTabs.addEventListener('click', () => {
    btnFilterOpenTabs.classList.add('active');
    btnFilterHistory.classList.remove('active');
    currentBrowseMode = 'openTabs';
    loadOpenTabs();
  });

  btnFilterHistory.addEventListener('click', () => {
    btnFilterHistory.classList.add('active');
    btnFilterOpenTabs.classList.remove('active');
    currentBrowseMode = 'history';
    loadHistory();
  });

  // Search filter
  searchInput.addEventListener('input', () => {
    if (currentBrowseMode === 'openTabs') {
      renderSiteList(filterItems(openTabsList, searchInput.value));
    } else {
      loadHistory(searchInput.value);
    }
  });

  function filterItems(items, query) {
    if (!query) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.url && item.url.toLowerCase().includes(q))
    );
  }

  // ====================== 2. Lấy dữ liệu Open Tabs & History ======================
  async function loadOpenTabs() {
    try {
      siteListContainer.innerHTML = '<div class="empty-state">Đang tải các tab...</div>';
      const tabs = await chrome.tabs.query({});
      // Lọc bỏ trang internal
      openTabsList = tabs.filter((t) => isValidWebUrl(t.url));
      openTabsCount.textContent = openTabsList.length;
      renderSiteList(filterItems(openTabsList, searchInput.value));
    } catch (e) {
      siteListContainer.innerHTML = `<div class="empty-state">Không thể đọc tab: ${e.message}</div>`;
    }
  }

  async function loadHistory(query = '') {
    try {
      siteListContainer.innerHTML = '<div class="empty-state">Đang tải lịch sử duyệt web...</div>';
      const results = await chrome.history.search({
        text: query,
        maxResults: 60,
        startTime: 0
      });

      // Lọc và loại trừ URL trùng lặp gần nhau
      const seenUrls = new Set();
      historyList = [];
      for (const item of results) {
        if (isValidWebUrl(item.url) && !seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          historyList.push(item);
        }
      }

      renderSiteList(historyList);
    } catch (e) {
      siteListContainer.innerHTML = `<div class="empty-state">Không thể đọc lịch sử: ${e.message}</div>`;
    }
  }

  function isValidWebUrl(url) {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  // Render danh sách các website
  function renderSiteList(items) {
    if (!items || items.length === 0) {
      siteListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🌐</div>
          <div>Không tìm thấy trang web nào phù hợp</div>
        </div>
      `;
      return;
    }

    siteListContainer.innerHTML = '';
    items.forEach((item) => {
      const isAlreadyBlocked = Boolean(StorageService.findMatchedGroup(item.url, cachedRules.groups));
      const el = document.createElement('div');
      el.className = 'site-item';

      let faviconSrc = item.favIconUrl;
      if (!faviconSrc) {
        try {
          const u = new URL(item.url);
          faviconSrc = `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
        } catch (e) {
          faviconSrc = 'icons/icon16.png';
        }
      }

      el.innerHTML = `
        <div class="site-info" title="${escapeHtml(item.url)}">
          <img src="${faviconSrc}" class="site-favicon" alt="icon">
          <div class="site-meta">
            <div class="site-title">${escapeHtml(item.title || item.url)}</div>
            <div class="site-url">${escapeHtml(item.url)}</div>
          </div>
        </div>
        <div>
          ${
            isAlreadyBlocked
              ? `<button class="btn-quick-block blocked" disabled>✓ Đã chặn</button>`
              : `<button class="btn-quick-block" data-url="${escapeHtml(item.url)}" data-title="${escapeHtml(item.title || '')}" ${item.id ? `data-tabid="${item.id}"` : ''}>⚡ Block</button>`
          }
        </div>
      `;

      // Xử lý fallback icon an toàn qua addEventListener (tuân thủ Chrome CSP)
      const faviconImg = el.querySelector('.site-favicon');
      if (faviconImg) {
        faviconImg.addEventListener('error', () => {
          faviconImg.src = 'icons/icon16.png';
        });
      }

      siteListContainer.appendChild(el);
    });

    // Gắn sự kiện click Block
    siteListContainer.querySelectorAll('.btn-quick-block:not(.blocked)').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const url = btn.getAttribute('data-url');
        const title = btn.getAttribute('data-title');
        const tabId = btn.getAttribute('data-tabid');

        await handleQuickBlock(btn, url, title, tabId);
      });
    });
  }

  // Xử lý khi bấm nút Block nhanh
  async function handleQuickBlock(btnElement, url, title, tabId) {
    btnElement.disabled = true;
    btnElement.textContent = '...';

    try {
      const newRule = await StorageService.addQuickRule(url, title);
      cachedRules = await StorageService.getRules();
      updateRulesCountBadge();

      btnElement.className = 'btn-quick-block blocked';
      btnElement.textContent = '✓ Đã chặn';

      showToast(`Đã thêm quy tắc cho ${newRule.name} (Tự đóng sau ${newRule.closeTimeout / 1000}s) & Đã đồng bộ ☁️`);

      // Tự đóng tab nếu bật tuỳ chọn closeCurrentOnBlock
      if (cachedSettings.closeCurrentOnBlock && tabId) {
        try {
          chrome.tabs.remove(Number(tabId));
        } catch (e) {}
      }
    } catch (err) {
      console.error(err);
      btnElement.disabled = false;
      btnElement.textContent = '⚡ Block';
      showToast('Có lỗi xảy ra: ' + err.message);
    }
  }

  // ====================== 3. Quản lý Quy tắc & Test Regex ======================
  function renderRulesList() {
    if (!cachedRules.groups || cachedRules.groups.length === 0) {
      rulesListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div>Chưa có quy tắc nào. Hãy duyệt qua tab hoặc lịch sử để bấm Block nhanh!</div>
        </div>
      `;
      return;
    }

    rulesListContainer.innerHTML = '';
    cachedRules.groups.forEach((group) => {
      const card = document.createElement('div');
      card.className = 'rule-card';
      const isEnabled = group.enabled !== false;
      const timeoutSec = (group.closeTimeout || 0) / 1000;

      card.innerHTML = `
        <div class="rule-header">
          <span class="rule-title">${escapeHtml(group.name)}</span>
          <div class="rule-actions">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 11px;">
              <input type="checkbox" class="rule-toggle" data-id="${group.id}" ${isEnabled ? 'checked' : ''}>
              ${isEnabled ? 'Bật' : 'Tắt'}
            </label>
            <button class="btn-sm-action btn-delete-rule" data-id="${group.id}" style="color: var(--danger);">Xóa</button>
          </div>
        </div>
        <div class="rule-pattern" title="Cú pháp Regex">${escapeHtml(group.matches.join(' | '))}</div>
        <div class="rule-footer">
          <span>⏱ Tự đóng sau: <strong>${timeoutSec}s</strong></span>
        </div>
      `;

      rulesListContainer.appendChild(card);
    });

    // Sự kiện Bật/Tắt rule
    rulesListContainer.querySelectorAll('.rule-toggle').forEach((chk) => {
      chk.addEventListener('change', async () => {
        const id = chk.getAttribute('data-id');
        await StorageService.toggleRule(id, chk.checked);
        cachedRules = await StorageService.getRules();
        renderRulesList();
        showToast(chk.checked ? 'Đã bật quy tắc' : 'Đã tạm tắt quy tắc');
      });
    });

    // Sự kiện Xóa rule
    rulesListContainer.querySelectorAll('.btn-delete-rule').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Bạn có chắc muốn xóa quy tắc này?')) {
          await StorageService.removeRule(id);
          cachedRules = await StorageService.getRules();
          updateRulesCountBadge();
          renderRulesList();
          showToast('Đã xóa quy tắc & Đã đồng bộ ☁️');
        }
      });
    });
  }

  // Kiểm tra Regex theo thời gian thực (User test lại nội dung vừa nhập)
  testerInput.addEventListener('input', () => {
    const testUrl = testerInput.value.trim();
    if (!testUrl) {
      testerResult.style.display = 'none';
      return;
    }

    const matched = StorageService.findMatchedGroup(testUrl, cachedRules.groups);
    if (matched) {
      testerResult.className = 'tester-result matched';
      testerResult.innerHTML = `✅ <strong>Khớp quy tắc:</strong> "${escapeHtml(matched.name)}"<br>Tab này sẽ tự động đóng sau ${(matched.closeTimeout || 3000) / 1000} giây.`;
    } else {
      testerResult.className = 'tester-result unmatched';
      testerResult.innerHTML = `⚪ Link này <strong>không khớp</strong> với bất kỳ quy tắc nào đang bật.`;
    }
  });

  // Nút thêm quy tắc thủ công nếu muốn
  btnManualAddRule.addEventListener('click', async () => {
    const pattern = prompt('Nhập URL hoặc Regex cần tự động đóng (ví dụ: zoom.us/j/ hoặc meet.google.com):');
    if (!pattern) return;

    const name = prompt('Tên gợi nhớ quy tắc:', pattern) || pattern;
    const timeoutSec = prompt('Thời gian chờ (giây):', cachedSettings.defaultTimeout || 3);
    const timeoutMs = (Number(timeoutSec) || 3) * 1000;

    const newGroup = {
      id: 'rule_' + Date.now(),
      name: name,
      matches: [pattern],
      excludeMatches: [],
      closeTimeout: timeoutMs,
      enabled: true,
      createdAt: Date.now()
    };

    cachedRules.groups.unshift(newGroup);
    await StorageService.saveRules(cachedRules);
    updateRulesCountBadge();
    renderRulesList();
    showToast('Đã thêm quy tắc mới & Đã đồng bộ ☁️');
  });

  // ====================== 4. Cài đặt & Sao lưu ======================
  settingDefaultTimeout.addEventListener('change', async () => {
    const val = Math.max(0, parseInt(settingDefaultTimeout.value, 10) || 3);
    settingDefaultTimeout.value = val;
    cachedSettings.defaultTimeout = val;
    await StorageService.saveSettings(cachedSettings);
    showToast(`Đã lưu thời gian chờ mặc định: ${val} giây ☁️`);
  });

  settingCloseOnBlock.addEventListener('change', async () => {
    cachedSettings.closeCurrentOnBlock = settingCloseOnBlock.checked;
    await StorageService.saveSettings(cachedSettings);
    showToast('Đã cập nhật cài đặt ☁️');
  });

  // Xuất file JSON
  btnExportRules.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cachedRules, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `tabs-auto-close-rules-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Đã tải xuống file cấu hình JSON');
  });

  // Nhập file JSON
  btnImportRules.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported && Array.isArray(imported.groups)) {
          cachedRules = imported;
          await StorageService.saveRules(cachedRules);
          updateRulesCountBadge();
          renderRulesList();
          showToast('Nhập dữ liệu thành công & Đã đồng bộ ☁️');
        } else {
          alert('Định dạng file JSON không hợp lệ (cần có mảng "groups").');
        }
      } catch (err) {
        alert('Lỗi đọc file: ' + err.message);
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });

  // ====================== Helper Utils ======================
  function showToast(msg) {
    toastNotice.textContent = msg;
    toastNotice.style.display = 'block';
    setTimeout(() => {
      toastNotice.style.display = 'none';
    }, 2800);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Khởi động
  await init();
});