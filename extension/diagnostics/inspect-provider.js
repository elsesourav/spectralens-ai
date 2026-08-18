/**
 * ============================================================================
 * SPECTRALENS AI — ADVANCED DOM INSPECTOR & CONSOLE DIAGNOSTIC TOOL
 * ============================================================================
 * Paste this into DevTools Console on any AI Provider page (Google, ChatGPT,
 * Claude, Gemini, Perplexity, Bing, Grok, etc.).
 *
 * It will display an on-screen dialog with a 1-click COPY button and log
 * the complete details to the console.
 * ============================================================================
 */

(() => {
  const getCssSelector = (el) => {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return "";
    if (el.id) return `#${el.id}`;
    let path = el.tagName.toLowerCase();
    if (el.name) path += `[name="${el.name}"]`;
    if (el.getAttribute("aria-label")) path += `[aria-label="${el.getAttribute("aria-label")}"]`;
    if (el.getAttribute("data-testid")) path += `[data-testid="${el.getAttribute("data-testid")}"]`;
    if (el.className && typeof el.className === "string") {
      const firstClass = el.className.trim().split(/\s+/)[0];
      if (firstClass && !firstClass.includes(":")) path += `.${firstClass}`;
    }
    return path;
  };

  const getElementDetails = (el) => {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      selector: getCssSelector(el),
      tagName: el.tagName.toLowerCase(),
      id: el.id || undefined,
      name: el.name || undefined,
      className: el.className?.toString()?.slice(0, 150) || undefined,
      role: el.getAttribute("role") || undefined,
      placeholder: el.getAttribute("placeholder") || el.getAttribute("data-placeholder") || undefined,
      ariaLabel: el.getAttribute("aria-label") || undefined,
      dataTestId: el.getAttribute("data-testid") || undefined,
      type: el.getAttribute("type") || undefined,
      value: (el.value || "").slice(0, 60),
      innerTextSample: (el.innerText || "").slice(0, 80).trim(),
      isContentEditable: el.isContentEditable || el.getAttribute("contenteditable") === "true",
      size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
      outerHtmlPreview: el.outerHTML.slice(0, 200),
    };
  };

  // 1. Inputs & Textareas
  const allInputs = Array.from(
    document.querySelectorAll('textarea, input[type="text"], input[type="search"], input:not([type]), [contenteditable="true"], [role="textbox"], [role="searchbox"], [role="combobox"]')
  )
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .map((el) => getElementDetails(el));

  // 2. Buttons & Submit Triggers
  const allButtons = Array.from(
    document.querySelectorAll('button, input[type="submit"], [role="button"]')
  )
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    })
    .map((el) => getElementDetails(el))
    .slice(0, 15);

  // 3. AI Overview & Response Containers
  const potentialResponseSelectors = [
    // Google AI Overview & Knowledge Graph
    'div[data-attrid="wa:/description"]',
    'div.mJxzKc',
    'div.UDZeY',
    'div.w7DbBe',
    'div.I6TXqe',
    'div.kno-rdesc',
    'div[data-md]',
    '#rso',
    '.MjjYud',
    // ChatGPT / Claude / Gemini / Perplexity / Copilot / Grok
    '[data-message-author-role="assistant"]',
    '[data-testid*="conversation-turn"]',
    '.agent-turn',
    '.font-claude-message',
    'model-response',
    'message-content',
    '[data-testid="answer-content"]',
    '.prose',
    '.markdown',
  ];

  const foundResponseContainers = [];
  potentialResponseSelectors.forEach((sel) => {
    const matched = document.querySelectorAll(sel);
    if (matched.length > 0) {
      foundResponseContainers.push({
        selectorTested: sel,
        matchCount: matched.length,
        lastElement: getElementDetails(matched[matched.length - 1]),
      });
    }
  });

  // 4. Follow-up Inputs (e.g. Google "Ask a follow up", ChatGPT follow up)
  const followUpInputs = Array.from(
    document.querySelectorAll('[placeholder*="follow" i], [aria-label*="follow" i], [data-placeholder*="follow" i], textarea, input')
  )
    .filter((el) => {
      const text = (el.placeholder || el.getAttribute("aria-label") || el.getAttribute("data-placeholder") || "").toLowerCase();
      return text.includes("follow") || text.includes("ask") || text.includes("search");
    })
    .map((el) => getElementDetails(el));

  const diagnosticReport = {
    timestamp: new Date().toISOString(),
    url: window.location.href,
    title: document.title,
    inputs: allInputs,
    followUpInputs: followUpInputs,
    buttons: allButtons,
    responseContainers: foundResponseContainers,
  };

  const reportJson = JSON.stringify(diagnosticReport, null, 2);

  // Display on-screen overlay modal for easy 1-click copy
  const existingModal = document.getElementById("spectralens-diagnostic-modal");
  if (existingModal) existingModal.remove();

  const modal = document.createElement("div");
  modal.id = "spectralens-diagnostic-modal";
  modal.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 480px;
    max-height: 80vh;
    background: #0f172a;
    color: #f8fafc;
    border: 2px solid #3b82f6;
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.7);
    z-index: 999999999;
    font-family: monospace;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  modal.innerHTML = `
    <div style="padding: 12px 16px; background: #1e293b; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: bold; color: #60a5fa; font-size: 13px;">🔍 SpectraLens DOM Diagnostic</span>
      <button id="sl-close-btn" style="background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer;">✕</button>
    </div>
    <div style="padding: 10px 16px; background: #0b1329;">
      <button id="sl-copy-btn" style="width: 100%; padding: 8px; background: #2563eb; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">
        📋 Click to Copy Full Diagnostic Report
      </button>
    </div>
    <textarea readonly style="flex: 1; min-height: 280px; background: #020617; color: #a5f3fc; border: none; padding: 12px; font-size: 11px; resize: none; font-family: monospace;">${reportJson}</textarea>
  `;

  document.body.appendChild(modal);

  document.getElementById("sl-close-btn").onclick = () => modal.remove();
  const copyBtn = document.getElementById("sl-copy-btn");
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(reportJson).then(() => {
      copyBtn.innerText = "✅ COPIED TO CLIPBOARD!";
      copyBtn.style.background = "#10b981";
      setTimeout(() => {
        copyBtn.innerText = "📋 Click to Copy Full Diagnostic Report";
        copyBtn.style.background = "#2563eb";
      }, 2500);
    });
  };

  console.log("%c🔍 [SpectraLens Diagnostic Report]", "color: #38bdf8; font-weight: bold;", diagnosticReport);
  return diagnosticReport;
})();
