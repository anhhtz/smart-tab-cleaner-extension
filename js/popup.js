/**
 * Popup UI Logic - Smart Tab Cleaner
 * Hỗ trợ Đa ngôn ngữ (i18n), Đơn vị mili-giây (ms), và Modal thêm quy tắc thủ công
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

  // Modal Elements
  const manualRuleModal = document.getElementById('manualRuleModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnCancelModal = document.getElementById('btnCancelModal');
  const btnSaveModal = document.getElementById('btnSaveModal');
  const modalRuleName = document.getElementById('modalRuleName');
  const modalRulePattern = document.getElementById('modalRulePattern');
  const modalRuleTimeout = document.getElementById('modalRuleTimeout');
  const modalTimeoutPills = document.querySelectorAll('#modalTimeoutPills .timeout-pill');

  // State
  let currentBrowseMode = 'openTabs'; // 'openTabs' | 'history'
  let cachedRules = { groups: [] };
  let cachedSettings = { defaultTimeout: 500, closeCurrentOnBlock: false };
  let openTabsList = [];
  let historyList = [];

  // ====================== 0. i18n & Utility Helpers ======================
  function t(key, substitutions = []) {
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
      const msg = chrome.i18n.getMessage(key, substitutions);
      if (msg) return msg;
    }
    return key;
  }

  function localizeHtml() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const msg = t(key);
      if (msg) el.textContent = msg;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const msg = t(key);
      if (msg) el.placeholder = msg;
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const msg = t(key);
      if (msg) el.title = msg;
    });
  }

  function formatTimeout(ms) {
    const num = Number(ms) || 0;
    if (num < 1000) return `${num}ms`;
    if (num % 1000 === 0) return `${num / 1000}s (${num}ms)`;
    return `${(num / 1000).toFixed(1)}s (${num}ms)`;
  }

  // ====================== 1. Khởi tạo & Tab Navigation ======================
  async function init() {
    localizeHtml();

    cachedSettings = await StorageService.getSettings();
    cachedRules = await StorageService.getRules();

    // Cập nhật giá trị vào Settings form (mili-giây)
    settingDefaultTimeout.value = cachedSettings.defaultTimeout || 500;
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
      siteListContainer.innerHTML = `<div class="empty-state">${escapeHtml(t('loadingTabs'))}</div>`;
      const tabs = await chrome.tabs.query({});
      // Lọc bỏ trang internal
      openTabsList = tabs.filter((t) => isValidWebUrl(t.url));
      openTabsCount.textContent = openTabsList.length;
      renderSiteList(filterItems(openTabsList, searchInput.value));
    } catch (e) {
      siteListContainer.innerHTML = `<div class="empty-state">${escapeHtml(t('cantReadTabs') + e.message)}</div>`;
    }
  }

  async function loadHistory(query = '') {
    try {
      siteListContainer.innerHTML = `<div class="empty-state">${escapeHtml(t('loadingHistory'))}</div>`;
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
      siteListContainer.innerHTML = `<div class="empty-state">${escapeHtml(t('cantReadHistory') + e.message)}</div>`;
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
          <div>${escapeHtml(t('emptySearch'))}</div>
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
              ? `<button class="btn-quick-block blocked" disabled>${escapeHtml(t('btnBlocked'))}</button>`
              : `<button class="btn-quick-block" data-url="${escapeHtml(item.url)}" data-title="${escapeHtml(item.title || '')}" ${item.id ? `data-tabid="${item.id}"` : ''}>${escapeHtml(t('btnBlock'))}</button>`
          }
        </div>
      `;

      // Fallback icon khi không load được
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
      btn.addEventListener('click', async () => {
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
      btnElement.textContent = t('btnBlocked');

      showToast(t('toastRuleAdded', [newRule.name, formatTimeout(newRule.closeTimeout)]));

      // Tự đóng tab nếu bật tuỳ chọn closeCurrentOnBlock
      if (cachedSettings.closeCurrentOnBlock && tabId) {
        try {
          chrome.tabs.remove(Number(tabId));
        } catch (e) {}
      }
    } catch (err) {
      console.error(err);
      btnElement.disabled = false;
      btnElement.textContent = t('btnBlock');
      showToast(t('toastError') + err.message);
    }
  }

  // ====================== 3. Quản lý Quy tắc & Test Regex ======================
  function renderRulesList() {
    if (!cachedRules.groups || cachedRules.groups.length === 0) {
      rulesListContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <div>${escapeHtml(t('emptyRules'))}</div>
        </div>
      `;
      return;
    }

    rulesListContainer.innerHTML = '';
    cachedRules.groups.forEach((group) => {
      const card = document.createElement('div');
      card.className = 'rule-card';
      const isEnabled = group.enabled !== false;

      card.innerHTML = `
        <div class="rule-header">
          <span class="rule-title">${escapeHtml(group.name)}</span>
          <div class="rule-actions">
            <label style="cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 11px;">
              <input type="checkbox" class="rule-toggle" data-id="${group.id}" ${isEnabled ? 'checked' : ''}>
              ${isEnabled ? escapeHtml(t('ruleEnabled')) : escapeHtml(t('ruleDisabled'))}
            </label>
            <button class="btn-sm-action btn-delete-rule" data-id="${group.id}" style="color: var(--danger);">${escapeHtml(t('btnDelete'))}</button>
          </div>
        </div>
        <div class="rule-pattern" title="Regex pattern">${escapeHtml(group.matches.join(' | '))}</div>
        <div class="rule-footer">
          <span>${escapeHtml(t('ruleClosesAfter'))} <strong>${formatTimeout(group.closeTimeout)}</strong></span>
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
        showToast(chk.checked ? t('toastRuleEnabled') : t('toastRuleDisabled'));
      });
    });

    // Sự kiện Xóa rule
    rulesListContainer.querySelectorAll('.btn-delete-rule').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm(t('confirmDeleteRule'))) {
          await StorageService.removeRule(id);
          cachedRules = await StorageService.getRules();
          updateRulesCountBadge();
          renderRulesList();
          showToast(t('toastRuleDeleted'));
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
      testerResult.innerHTML = t('testerMatched', [escapeHtml(matched.name), formatTimeout(matched.closeTimeout || 500)]);
    } else {
      testerResult.className = 'tester-result unmatched';
      testerResult.innerHTML = t('testerUnmatched');
    }
  });

  // ====================== 4. Modal Thêm quy tắc thủ công ======================
  function openManualRuleModal() {
    modalRuleName.value = '';
    modalRulePattern.value = '';
    modalRuleTimeout.value = cachedSettings.defaultTimeout || 500;
    updatePillSelection(modalRuleTimeout.value);
    manualRuleModal.style.display = 'flex';
    setTimeout(() => modalRulePattern.focus(), 50);
  }

  function closeManualRuleModal() {
    manualRuleModal.style.display = 'none';
  }

  function updatePillSelection(val) {
    modalTimeoutPills.forEach((pill) => {
      if (pill.getAttribute('data-ms') === String(val)) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  btnManualAddRule.addEventListener('click', openManualRuleModal);
  btnCloseModal.addEventListener('click', closeManualRuleModal);
  btnCancelModal.addEventListener('click', closeManualRuleModal);

  // Đóng modal khi click ra vùng nền mờ bên ngoài
  manualRuleModal.addEventListener('click', (e) => {
    if (e.target === manualRuleModal) closeManualRuleModal();
  });

  // Đóng modal bằng phím Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && manualRuleModal.style.display === 'flex') {
      closeManualRuleModal();
    }
  });

  // Chọn nhanh các mốc timeout qua pill (0ms, 500ms, 1s, 3s)
  modalTimeoutPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      const ms = pill.getAttribute('data-ms');
      modalRuleTimeout.value = ms;
      updatePillSelection(ms);
    });
  });

  modalRuleTimeout.addEventListener('input', () => {
    updatePillSelection(modalRuleTimeout.value);
  });

  // Lưu quy tắc từ modal
  btnSaveModal.addEventListener('click', async () => {
    await handleSaveModalRule();
  });

  // Nhấn Enter trong form modal để lưu ngay
  [modalRuleName, modalRulePattern, modalRuleTimeout].forEach((input) => {
    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await handleSaveModalRule();
      }
    });
  });

  async function handleSaveModalRule() {
    const pattern = modalRulePattern.value.trim();
    if (!pattern) {
      alert(t('validationPatternRequired'));
      modalRulePattern.focus();
      return;
    }

    const name = modalRuleName.value.trim() || pattern;
    const timeoutMs = Math.max(0, parseInt(modalRuleTimeout.value, 10) || 0);

    const newGroup = {
      id: 'rule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
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
    closeManualRuleModal();
    showToast(t('toastRuleAdded', [newGroup.name, formatTimeout(timeoutMs)]));
  }

  // ====================== 5. Cài đặt & Sao lưu ======================
  settingDefaultTimeout.addEventListener('change', async () => {
    const val = Math.max(0, parseInt(settingDefaultTimeout.value, 10) || 500);
    settingDefaultTimeout.value = val;
    cachedSettings.defaultTimeout = val;
    await StorageService.saveSettings(cachedSettings);
    showToast(t('toastTimeoutSaved', [String(val)]));
  });

  settingCloseOnBlock.addEventListener('change', async () => {
    cachedSettings.closeCurrentOnBlock = settingCloseOnBlock.checked;
    await StorageService.saveSettings(cachedSettings);
    showToast(t('toastSettingsSaved'));
  });

  // Xuất file JSON
  btnExportRules.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cachedRules, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `smart-tab-cleaner-rules-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(t('toastExportSuccess'));
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
          showToast(t('toastImportSuccess'));
        } else {
          alert(t('invalidJson'));
        }
      } catch (err) {
        alert(t('fileReadError') + err.message);
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });

  // ====================== Toast Helper ======================
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