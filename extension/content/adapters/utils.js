/**
 * SpectraLens AI — Adapter Utilities
 * Theme-aware styling, logging, and color virtualization helpers.
 */
(function (global) {
  "use strict";

  /** Forward logs to background console only when developer mode is active */
  function tabLog(tag, message, data = null) {
    if (typeof isDevModeActive === "function" && !isDevModeActive()) return;
    console.log(`[SpectraLens:${tag}] ${message}`, data || "");
    try {
      if (
        typeof chrome !== "undefined" &&
        Boolean(chrome?.runtime?.id) &&
        chrome.runtime?.sendMessage
      ) {
        chrome.runtime
          .sendMessage({
            type: "TAB_LOG",
            tag,
            message,
            data,
          })
          .catch(() => {});
      }
    } catch {}
  }

  /**
   * Parse RGB, RGBA, Hex (#rgb, #rrggbb), and CSS Color Level 4 (rgb(r g b / a), color(srgb))
   */
  function parseRgbColor(colorStr) {
    if (!colorStr || typeof colorStr !== "string") return null;
    const str = colorStr.trim();

    // 1. Standard rgb(r, g, b) or rgba(r, g, b, a) or space-separated rgb(r g b)
    const rgbMatch = str.match(
      /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i,
    );
    if (rgbMatch) {
      return {
        r: Math.round(parseFloat(rgbMatch[1])),
        g: Math.round(parseFloat(rgbMatch[2])),
        b: Math.round(parseFloat(rgbMatch[3])),
        a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
      };
    }

    // 2. Hex #rrggbb, #rgba, #rgb
    if (str.startsWith("#")) {
      const hex = str.slice(1);
      if (hex.length === 3 || hex.length === 4) {
        return {
          r: parseInt(hex[0] + hex[0], 16),
          g: parseInt(hex[1] + hex[1], 16),
          b: parseInt(hex[2] + hex[2], 16),
          a: hex[3] ? parseInt(hex[3] + hex[3], 16) / 255 : 1,
        };
      }
      if (hex.length === 6 || hex.length === 8) {
        return {
          r: parseInt(hex.slice(0, 2), 16),
          g: parseInt(hex.slice(2, 4), 16),
          b: parseInt(hex.slice(4, 6), 16),
          a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
        };
      }
    }

    // 3. color(srgb r g b)
    const srgbMatch = str.match(
      /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)/i,
    );
    if (srgbMatch) {
      return {
        r: Math.round(parseFloat(srgbMatch[1]) * 255),
        g: Math.round(parseFloat(srgbMatch[2]) * 255),
        b: Math.round(parseFloat(srgbMatch[3]) * 255),
        a: srgbMatch[4] !== undefined ? parseFloat(srgbMatch[4]) : 1,
      };
    }

    return null;
  }

  /**
   * Deep Theme-Aware Color Virtualizer
   * Replaces static hardcoded computed colors with dynamic SpectraLens CSS variables
   * so the entire response automatically adapts to Light, Dark, High-Contrast & Custom themes.
   */
  function virtualizeComputedStyle(
    prop,
    val,
    tagName = "",
    isTopContainer = false,
  ) {
    if (
      !val ||
      val === "normal" ||
      val === "none" ||
      val === "auto" ||
      val === "0px"
    )
      return "";
    if (val === "rgba(0, 0, 0, 0)" || val === "transparent") {
      return prop.includes("background") ? "transparent" : "";
    }

    const tag = (tagName || "").toUpperCase();

    // 1. Color / Background / Border / Fill / Stroke Virtualization
    if (
      prop === "color" ||
      prop === "background-color" ||
      (prop.includes("border") && prop.includes("color")) ||
      prop === "fill" ||
      prop === "stroke"
    ) {
      const rgb = parseRgbColor(val);
      if (!rgb) {
        if (prop === "color") return "var(--sl-text-primary, #0f172a)";
        return val;
      }
      const { r, g, b, a } = rgb;
      if (a < 0.05) return prop.includes("background") ? "transparent" : "";

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const isBlue = b > r + 30 && b > g;
      const isRed = r > g + 40 && r > b + 40;
      const isGreen = g > r + 30 && g > b + 30;

      // Text Colors
      if (prop === "color") {
        if (tag === "A" || isBlue) return "var(--sl-text-link, #2563eb)";
        if (isRed) return "var(--sl-text-danger, #ef4444)";
        if (isGreen) return "var(--sl-text-success, #10b981)";
        if (lum < 80 || lum > 210) return "var(--sl-text-primary, #0f172a)";
        if (lum >= 80 && lum < 140) return "var(--sl-text-secondary, #334155)";
        return "var(--sl-text-muted, #64748b)";
      }

      // Background Colors
      if (prop === "background-color") {
        if (tag === "PRE" || tag === "CODE")
          return "var(--sl-bg-code, #f1f5f9)";
        if (isBlue && (a < 0.3 || lum > 190))
          return "var(--sl-accent-bg, rgba(59, 130, 246, 0.08))";
        // Near-white / very light surfaces
        if (r >= 235 && g >= 235 && b >= 235) {
          if (
            isTopContainer ||
            tag === "SECTION" ||
            tag === "MAIN" ||
            (tag === "DIV" && !tag.includes("BUTTON"))
          ) {
            return "transparent";
          }
          return "var(--sl-bg-surface-elevated, #ffffff)";
        }
        // Subtle pills / chips
        if (lum >= 190) {
          return "var(--sl-bg-surface-subtle, #f1f5f9)";
        }
        // Dark host mode backgrounds
        if (lum < 70) {
          if (isTopContainer) return "transparent";
          return "var(--sl-bg-surface, rgba(30, 41, 59, 0.7))";
        }
        return "var(--sl-bg-surface-subtle, #f1f5f9)";
      }

      // Border Colors
      if (prop.includes("border") && prop.includes("color")) {
        if (isBlue) return "var(--sl-accent, #3b82f6)";
        if (lum > 175) return "var(--sl-border-subtle, #e2e8f0)";
        return "var(--sl-border-strong, #cbd5e1)";
      }

      // SVG Fill & Stroke
      if (prop === "fill" || prop === "stroke") {
        if (isBlue) return "var(--sl-text-link, #2563eb)";
        return "currentColor";
      }
    }

    // 2. Box Shadow Virtualization
    if (prop === "box-shadow" && val && val !== "none") {
      return "var(--sl-shadow, 0 1px 3px rgba(0, 0, 0, 0.06))";
    }

    // 3. Font Family Normalization
    if (prop === "font-family") {
      if (
        tag === "PRE" ||
        tag === "CODE" ||
        tag === "SAMP" ||
        tag === "KBD" ||
        tag === "VAR"
      ) {
        return "var(--sl-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)";
      }
      return "var(--sl-font-family, 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif)";
    }

    // 4. Compact Font-Size & Line-Height Scaling (Fit cleanly in chatbot popup/menu)
    if (prop === "font-size") {
      const match = String(val).match(/([\d.]+)px/i);
      if (match) {
        const px = parseFloat(match[1]);
        if (px >= 24) return "15px";
        if (px >= 20) return "14px";
        if (px >= 16) return "12.5px";
        if (px >= 14) return "12px";
        if (px >= 12) return "11px";
        return `${Math.max(10, Math.round(px * 0.82))}px`;
      }
    }

    if (prop === "line-height") {
      const match = String(val).match(/([\d.]+)px/i);
      if (match) {
        const px = parseFloat(match[1]);
        if (px >= 28) return "20px";
        if (px >= 22) return "18px";
        if (px >= 18) return "16px";
        return `${Math.max(14, Math.round(px * 0.82))}px`;
      }
    }

    // 5. Margin & Padding Compact Scaling for small chatbot view
    if (prop.startsWith("margin-") || prop.startsWith("padding-")) {
      const match = String(val).match(/([\d.]+)px/i);
      if (match) {
        const px = parseFloat(match[1]);
        if (px > 14) return "8px";
        if (px > 10) return "6px";
      }
    }

    return val;
  }

  global.tabLog = tabLog;
  global.parseRgbColor = parseRgbColor;
  global.virtualizeComputedStyle = virtualizeComputedStyle;
})(typeof window !== "undefined" ? window : globalThis);
