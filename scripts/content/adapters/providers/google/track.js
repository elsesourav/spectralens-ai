/**
 * SpectraLens AI — Google Search / AI Overview Track Script
 * Handles AI Overview multi-turn container extraction, shimmer indicator detection, and completion detection.
 */
(function (global) {
  "use strict";

  const GoogleSearchTrack = {
    findResponseContainer() {
      // 1. Target the LATEST turn's AI content container in the conversation thread
      const turns = document.querySelectorAll(
        'div[data-scope-id="turn"], div.CKgc1d[jsname="CS7uPe"], div.CKgc1d',
      );
      if (turns.length > 0) {
        for (let i = turns.length - 1; i >= 0; i--) {
          const turn = turns[i];
          // Check if the parent of the turn or turn itself holds the streaming chunks
          const parentWrapper = turn.parentElement;
          if (
            parentWrapper &&
            parentWrapper.querySelector('div[data-target-container-id], div[data-sn-op="2"]')
          ) {
            const text = (parentWrapper.textContent || "").trim();
            if (text.length > 20 && !text.startsWith("You sent:")) {
              return parentWrapper;
            }
          }

          const aiContainer = turn.querySelector(
            'div[data-subtree="aimc"] div[data-container-id="main-col"] .Dn7Fzd, div[data-subtree="aimc"] div[data-container-id="main-col"], div[data-subtree="aimc"] .Dn7Fzd, div[data-subtree="aimc"], div.mZJni.Dn7Fzd, div[data-container-id="main-col"] .Dn7Fzd, div[data-container-id="main-col"], div.mZJni',
          );
          if (aiContainer) {
            const text = (aiContainer.textContent || "").trim();
            if (text.length > 20 && !text.startsWith("You sent:")) {
              return aiContainer;
            }
          }

          const turnText = (turn.textContent || "").trim();
          if (turnText.length > 20 && !turnText.startsWith("You sent:")) {
            return turn;
          }
        }
      }

      // 2. Global AI Overview content selectors on the page (matching newest / last element)
      const selectors = [
        'div[data-target-container-id="main-col"]',
        'div[data-subtree="aimc"] div[data-container-id="main-col"] .Dn7Fzd',
        'div[data-subtree="aimc"] div[data-container-id="main-col"]',
        'div[data-subtree="aimc"] .Dn7Fzd',
        'div[data-subtree="aimc"] div.mZJni',
        'div[data-subtree="aimc"]',
        "div.mZJni.Dn7Fzd",
        "div.mZJni",
        "div.Dn7Fzd",
        'div[data-container-id="main-col"] .Dn7Fzd',
        'div[data-container-id="main-col"] div[jsname="N760b"]',
        'div[data-container-id="main-col"] div[data-attrid="wa:/description"]',
        'div[data-container-id="main-col"]',
        'div[data-attrid="wa:/description"]',
        "div.ULSXZd",
        "div.IZ6rdc",
        "div[data-sokoban-container]",
        "div.wDYxhc",
        "div.xpdopen",
        "div.kp-blk",
        "div.V3FYCf",
        "div.MjjYud",
        "#rso",
      ];

      for (const sel of selectors) {
        try {
          const matched = document.querySelectorAll(sel);
          if (matched.length > 0) {
            const lastEl = matched[matched.length - 1];
            if (lastEl && !lastEl.querySelector("textarea.ITIRGe")) {
              const text = (lastEl.textContent || "").trim();
              if (text.length > 25 && !text.startsWith("You sent:")) {
                return lastEl;
              }
            }
          }
        } catch {}
      }

      // 3. Fallback via Copy button parent (from the LAST copy button on the page)
      const copyBtns = Array.from(
        document.querySelectorAll(
          'button[aria-label="Copy text"].bKxaof, button[aria-label*="Copy text" i], button.bKxaof, button[aria-label="Copy text"]',
        ),
      );

      if (copyBtns.length > 0) {
        const lastCopyBtn = copyBtns[copyBtns.length - 1];
        const toolbar = lastCopyBtn.closest(
          '[role="toolbar"], div[jsaction], div.eGAasd, div',
        );
        if (toolbar && toolbar.parentElement) {
          const parent = toolbar.parentElement;
          const text = (parent.textContent || "").trim();
          if (
            text.length > 25 &&
            !parent.querySelector("textarea.ITIRGe") &&
            !parent.classList.contains("zkL70c") &&
            !text.startsWith("You sent:")
          ) {
            return parent;
          }
        }
      }

      return null;
    },

    isStreaming() {
      // 1. If network requests are actively streaming in the window, it is DEFINITELY streaming!
      const isDomActive =
        typeof document !== "undefined" &&
        document.documentElement &&
        parseInt(
          document.documentElement.getAttribute("data-sl-active-streams") || "0",
          10,
        ) > 0;
      if (
        isDomActive ||
        (typeof window !== "undefined" &&
          window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ > 0)
      ) {
        return true;
      }
      return Boolean(
        document.querySelector(
          'div.Dn7Fzd[aria-busy="true"], div[data-subtree="aimc"][aria-busy="true"], div.animate-pulse, div[data-is-streaming="true"], button[aria-label*="Generating" i], div.kCrYT .sh-sh-l, div[jsaction*="aimStreaming"]',
        ),
      );
    },

    isComplete() {
      // 1. If network requests are currently streaming, response is NOT complete
      const isDomActive =
        typeof document !== "undefined" &&
        document.documentElement &&
        parseInt(
          document.documentElement.getAttribute("data-sl-active-streams") || "0",
          10,
        ) > 0;
      if (
        isDomActive ||
        (typeof window !== "undefined" &&
          window.__SPECTRALENS_ACTIVE_NET_REQUESTS__ > 0)
      ) {
        return false;
      }

      const container = this.findResponseContainer();
      if (!container) return false;
      const text = (container.textContent || "").trim();
      if (text.length === 0) return false;

      // Check for completion signals scoped to the CURRENT container or its immediate action bar
      const hasLocalCompleteSignal = Boolean(
        container.querySelector(
          'div[data-complete="true"], div[jsaction*="aimRenderComplete"], div[data-xid="Gd7Hsc"], button[aria-label*="Copy" i], button.bKxaof',
        ) ||
        container.parentElement?.querySelector('button[aria-label*="Copy" i], button.bKxaof')
      );

      return !this.isStreaming() && hasLocalCompleteSignal;
    },

    getJunkSelectors() {
      return [
        'div[data-subtree="aimq"]',
        'div[aria-label*="You sent" i]',
        'div[data-xid*="user"]',
        'div[data-sfc-cp*="user"]',
        'div:has(> img[alt*="Visually searched" i])',
        'img[alt*="Visually searched" i]',
        'div[data-container-id="rhs-col"]',
        'div[data-xid="aim-aside-initial-corroboration-container"]',
        'div[data-xid="Gd7Hsc"]',
        'div[data-xid="YruvMc"]',
        "div.DBd2Wb",
        "div.zkL70c",
        "div.XvJeCb",
        "div.oLpkLe",
        "aside.L9AUvd",
        "div.NdrDyd",
        "div.LIBz9e",
        'div[data-msei]',
        'button[aria-label="Related results"]',
        "span.DHPVt.Wg1cdb.notranslate",
        "div.alk4p.q4PqPb",
        "div.Jd31eb",
        "style[data-ck]",
      ];
    },
  };

  global.GoogleSearchTrack = GoogleSearchTrack;
})(typeof window !== "undefined" ? window : globalThis);
