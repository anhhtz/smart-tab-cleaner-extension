/**
 * Smart Tab Cleaner - Interactive Landing Page Logic
 * Handles interactive mockup, FAQ accordion, and interactive regex tester
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. FAQ Accordion Toggle
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

  // 2. Interactive Extension Preview Tab Switcher
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

  // 3. Quick Block Demo Buttons inside Mockup
  const blockBtns = document.querySelectorAll('.demo-block-btn');
  blockBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('ext-btn-blocked')) {
        btn.classList.remove('ext-btn-blocked');
        btn.classList.add('ext-btn-block');
        btn.innerHTML = '⚡ Block';
      } else {
        btn.classList.remove('ext-btn-block');
        btn.classList.add('ext-btn-blocked');
        btn.innerHTML = '✓ Blocked';
      }
    });
  });

  // 4. Interactive URL Regex Match Tester Demo in Mockup
  const testerInput = document.getElementById('demoTesterInput');
  const testerResult = document.getElementById('demoTesterResult');
  const demoChips = document.querySelectorAll('.demo-url-chip');

  const sampleRules = [
    { name: 'Zoom Meeting Launcher', regex: /zoom\.us\/j\/.*/i, timeout: '500ms' },
    { name: 'Telegram Join Link', regex: /t\.me\/.*/i, timeout: '500ms' },
    { name: 'Pop-up Ad Tracker', regex: /livecasino|slowignition|dangkywinaz/i, timeout: '1ms' },
    { name: 'MS Teams Launcher', regex: /teams\.microsoft\.com\/.*\/launcher.*/i, timeout: '500ms' }
  ];

  function runTester(val) {
    if (!testerInput || !testerResult) return;
    const inputVal = (val !== undefined ? val : testerInput.value).trim();

    if (!inputVal) {
      testerResult.innerHTML = '<span style="color: #71717a; font-size: 0.75rem;">Type or paste a test URL above...</span>';
      return;
    }

    const matched = sampleRules.find((r) => r.regex.test(inputVal));
    if (matched) {
      testerResult.innerHTML = `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 10px; font-size: 0.75rem; color: #166534;">
          ✅ <strong>Matched rule:</strong> "${matched.name}"<br>
          <span style="font-size: 0.6875rem; color: #15803d;">This tab will close automatically after ${matched.timeout}.</span>
        </div>
      `;
    } else {
      testerResult.innerHTML = `
        <div style="background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 6px 10px; font-size: 0.75rem; color: #52525b;">
          ⚪ No active rules match this URL. Tab stays open.
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
