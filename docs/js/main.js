/**
 * Smart Tab Cleaner - Interactive Landing Page Logic
 * Handles language switching, interactive mockup, FAQ accordion, and interactive regex tester
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Multi-Language Switcher (EN / VI)
  const langButtons = document.querySelectorAll('.lang-switch-btn');
  
  function getInitialLanguage() {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get('lang');
    if (urlLang === 'vi' || urlLang === 'en') {
      return urlLang;
    }
    const saved = localStorage.getItem('stc_lang');
    if (saved === 'vi' || saved === 'en') {
      return saved;
    }
    // Default to 'en' for international compliance, unless browser is Vietnamese
    if (navigator.language && navigator.language.toLowerCase().startsWith('vi')) {
      return 'vi';
    }
    return 'en';
  }

  function setLanguage(lang) {
    const selected = (lang === 'vi') ? 'vi' : 'en';
    document.documentElement.lang = selected;
    document.body.setAttribute('data-lang', selected);
    localStorage.setItem('stc_lang', selected);

    // Update active class on all language buttons
    langButtons.forEach((btn) => {
      if (btn.getAttribute('data-lang') === selected) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Re-run tester with updated language strings if input has content
    if (typeof runTester === 'function') {
      runTester();
    }
  }

  langButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const lang = btn.getAttribute('data-lang');
      setLanguage(lang);
    });
  });

  // Initialize language
  const initialLang = getInitialLanguage();
  setLanguage(initialLang);

  // 2. FAQ Accordion Toggle
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    const questionBtn = item.querySelector('.faq-question');
    if (questionBtn) {
      questionBtn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Close all other items for clean single-open accordion feel
        faqItems.forEach((other) => other.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });

  // 3. Interactive Extension Preview Tab Switcher
  const mockupTabBtns = document.querySelectorAll('.ext-tab-btn');
  const mockupTabPanes = document.querySelectorAll('.ext-tab-pane');

  mockupTabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      mockupTabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      mockupTabPanes.forEach((pane) => {
        if (pane.id === targetTab) {
          pane.style.display = 'block';
        } else {
          pane.style.display = 'none';
        }
      });
    });
  });

  // 4. Quick Block Demo Buttons inside Mockup
  const blockBtns = document.querySelectorAll('.demo-block-btn');
  blockBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const isVi = document.body.getAttribute('data-lang') === 'vi';
      if (btn.classList.contains('ext-btn-blocked')) {
        btn.classList.remove('ext-btn-blocked');
        btn.classList.add('ext-btn-block');
        btn.innerHTML = isVi ? '⚡ Chặn' : '⚡ Block';
      } else {
        btn.classList.remove('ext-btn-block');
        btn.classList.add('ext-btn-blocked');
        btn.innerHTML = isVi ? '✓ Đã chặn' : '✓ Blocked';
      }
    });
  });

  // 5. Interactive URL Regex Match Tester Demo in Mockup
  const testerInput = document.getElementById('demoTesterInput');
  const testerResult = document.getElementById('demoTesterResult');
  const demoChips = document.querySelectorAll('.demo-url-chip');

  const sampleRules = [
    { nameEn: 'Zoom Meeting Launcher', nameVi: 'Zoom Meeting Launcher', regex: /zoom\.us\/j\/.*/i, timeout: '500ms' },
    { nameEn: 'Telegram Join Link', nameVi: 'Link nhóm Telegram', regex: /t\.me\/.*/i, timeout: '500ms' },
    { nameEn: 'Pop-up Ad Tracker', nameVi: 'Quảng cáo Pop-up tự bung', regex: /livecasino|slowignition|dangkywinaz/i, timeout: '1ms' },
    { nameEn: 'MS Teams Launcher', nameVi: 'MS Teams Launcher', regex: /teams\.microsoft\.com\/.*\/launcher.*/i, timeout: '500ms' }
  ];

  function runTester(val) {
    if (!testerInput || !testerResult) return;
    const inputVal = (val !== undefined ? val : testerInput.value).trim();
    const isVi = document.body.getAttribute('data-lang') === 'vi';

    if (!inputVal) {
      testerResult.innerHTML = `<span style="color: #71717a; font-size: 0.75rem;">${isVi ? 'Nhập hoặc dán URL muốn thử nghiệm vào ô trên...' : 'Type or paste a test URL above...'}</span>`;
      return;
    }

    const matched = sampleRules.find((r) => r.regex.test(inputVal));
    if (matched) {
      const ruleName = isVi ? matched.nameVi : matched.nameEn;
      const subtitle = isVi 
        ? `Tab này sẽ tự động đóng sau ${matched.timeout}.` 
        : `This tab will close automatically after ${matched.timeout}.`;
      const title = isVi ? 'Khớp quy tắc:' : 'Matched rule:';

      testerResult.innerHTML = `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 10px; font-size: 0.75rem; color: #166534;">
          ✅ <strong>${title}</strong> "${ruleName}"<br>
          <span style="font-size: 0.6875rem; color: #15803d;">${subtitle}</span>
        </div>
      `;
    } else {
      const noMatchText = isVi 
        ? '⚪ URL này không khớp với bất kỳ quy tắc nào. Tab sẽ tiếp tục mở bình thường.' 
        : '⚪ No active rules match this URL. Tab stays open.';

      testerResult.innerHTML = `
        <div style="background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 6px 10px; font-size: 0.75rem; color: #52525b;">
          ${noMatchText}
        </div>
      `;
    }
  }

  if (testerInput) {
    testerInput.addEventListener('input', () => runTester());
  }

  demoChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const sample = chip.getAttribute('data-url');
      if (testerInput) {
        testerInput.value = sample;
        runTester(sample);
      }
    });
  });

  // Initialize tester
  if (testerInput && testerInput.value) {
    runTester();
  }
});
