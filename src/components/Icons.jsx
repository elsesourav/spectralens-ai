import PropTypes from "prop-types";

// ==========================================
// AI Provider Colorful Brand SVG Icons
// ==========================================

export function GoogleIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

GoogleIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function BingIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M5 3.5V20.5L10.5 17.5L14 20L19 17V7.5L13.5 5.5L8.5 7.5L5 3.5ZM8.5 7.5V15.5L13.5 13V8.5L8.5 7.5Z"
        fill="url(#bing-gradient)"
      />
      <defs>
        <linearGradient id="bing-gradient" x1="5" y1="3.5" x2="19" y2="20.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#008AD7" />
          <stop offset="0.5" stopColor="#0078D4" />
          <stop offset="1" stopColor="#005A9E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

BingIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function GeminiIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2C12 7.52 7.52 12 2 12C7.52 12 12 16.48 12 22C12 16.48 16.48 12 22 12C16.48 12 12 7.52 12 2Z"
        fill="url(#gemini-sparkle-gradient)"
      />
      <circle cx="19" cy="5" r="2" fill="#9168F8" />
      <circle cx="5" cy="19" r="1.5" fill="#3D85F7" />
      <defs>
        <linearGradient id="gemini-sparkle-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9168F8" />
          <stop offset="0.5" stopColor="#5E7BF8" />
          <stop offset="1" stopColor="#3D85F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

GeminiIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function PerplexityIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 2L4 7V17L12 22L20 17V7L12 2Z"
        stroke="#20B8CD"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 2V22" stroke="#20B8CD" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 7L20 17" stroke="#20B8CD" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 7L4 17" stroke="#20B8CD" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

PerplexityIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function GrokIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M3 21L13.5 10.5M21 3L10.5 13.5M3 3H8L21 21H16L3 3Z"
        stroke="url(#grok-gradient)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="grok-gradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F43F5E" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

GrokIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function ChatGPTIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20.5 10.2A5 5 0 0 0 17 3.5a5.05 5.05 0 0 0-4.6 2.3A5 5 0 0 0 4 7.2a5 5 0 0 0 .5 7.6 5 5 0 0 0 3.5 6.7 5.05 5.05 0 0 0 4.6-2.3 5 5 0 0 0 8.4-1.4 5 5 0 0 0-.5-7.6z"
        stroke="#10A37F"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v6M9.5 10.5l5 3M14.5 10.5l-5 3"
        stroke="#10A37F"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

ChatGPTIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function ClaudeIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" fill="#D97757" />
      <path
        d="M12 6V18M6 12H18M7.75 7.75L16.25 16.25M16.25 7.75L7.75 16.25"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

ClaudeIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function DeepSeekIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21C16.97 21 21 16.97 21 12"
        stroke="#1E88E5"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M17 7L11 13L8 10"
        stroke="#00E5FF"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="5" r="2.5" fill="#1E88E5" />
    </svg>
  );
}

DeepSeekIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function OllamaIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 18C7 19.1 7.9 20 9 20H15C16.1 20 17 19.1 17 18V13H7V18ZM17 10C17 8.9 16.1 8 15 8H14V5C14 4.45 13.55 4 13 4H11C10.45 4 10 4.45 10 5V8H9C7.9 8 7 8.9 7 10V11H17V10Z"
        fill="#38BDF8"
      />
      <circle cx="10" cy="14.5" r="1" fill="#0F172A" />
      <circle cx="14" cy="14.5" r="1" fill="#0F172A" />
    </svg>
  );
}

OllamaIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

// Helper to get Provider SVG by ID
export function ProviderIcon({ id, className = "w-4 h-4", size = 16 }) {
  const iconMap = {
    google: GoogleIcon,
    bing: BingIcon,
    gemini: GeminiIcon,
    perplexity: PerplexityIcon,
    grok: GrokIcon,
    chatgpt: ChatGPTIcon,
    claude: ClaudeIcon,
    deepseek: DeepSeekIcon,
    ollama: OllamaIcon,
  };

  const Component = iconMap[id?.toLowerCase()] || GoogleIcon;
  return <Component className={className} size={size} />;
}

ProviderIcon.propTypes = {
  id: PropTypes.string,
  className: PropTypes.string,
  size: PropTypes.number,
};

// ==========================================
// UI & Navigation Icons (Pixel-matched)
// ==========================================

export function AppLogoIcon({ className = "w-6 h-6", size = 24 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="24" height="24" rx="7" fill="url(#app-logo-bg)" />
      <path
        d="M7 8C7 6.89543 7.89543 6 9 6H15C16.1046 6 17 6.89543 17 8V14C17 15.1046 16.1046 16 15 16H11L7 19V8Z"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.5" cy="11" r="1" fill="#FFFFFF" />
      <circle cx="13.5" cy="11" r="1" fill="#FFFFFF" />
      <defs>
        <linearGradient id="app-logo-bg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

AppLogoIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function ChatIcon({ className = "w-5 h-5", size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 6C6 4.89543 6.89543 4 8 4H16C17.1046 4 18 4.89543 18 6V15C18 16.1046 17.1046 17 16 17H11L7 20V17H6C4.89543 17 4 16.1046 4 15V8C4 6.89543 4.89543 6 6 6Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="10.5" r="1.1" fill="currentColor" />
      <circle cx="14.5" cy="10.5" r="1.1" fill="currentColor" />
    </svg>
  );
}

ChatIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function ElementSelectorIcon({ className = "w-5 h-5", size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 8V5C4 4.44772 4.44772 4 5 4H8M16 4H19C19.5523 4 20 4.44772 20 5V8M20 16V19C20 19.5523 19.5523 20 19 20H16M8 20H5C4.44772 20 4 19.5523 4 19V16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 8V16M8 12H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

ElementSelectorIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function HistoryIcon({ className = "w-5 h-5", size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.9" />
      <path
        d="M12 7V12L15.5 14"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

HistoryIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function SettingsIcon({ className = "w-5 h-5", size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

SettingsIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function DragHandleIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="5" cy="4" r="1.5" />
      <circle cx="11" cy="4" r="1.5" />
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="11" cy="8" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="11" cy="12" r="1.5" />
    </svg>
  );
}

DragHandleIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function DoubleCheckIcon({ className = "w-3.5 h-3.5", size = 14 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.5 8.5L4.5 11.5L10.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 8.5L9.5 11.5L14.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

DoubleCheckIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function SendPlaneIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
    </svg>
  );
}

SendPlaneIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function FilterSlidersIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 6H14M18 6H20M14 4V8M4 12H8M12 12H20M8 10V14M4 18H16M20 18H20.01M16 16V20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

FilterSlidersIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function ThreeDotsIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  );
}

ThreeDotsIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };
