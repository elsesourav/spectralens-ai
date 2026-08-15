import PropTypes from "prop-types";

// ==========================================
// 1. Google AI SVG (Exact user-provided JSX)
// ==========================================
export function GoogleIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      className={className}
    >
      <g fill="none" fillRule="evenodd" clipRule="evenodd">
        <path
          fill="#F44336"
          d="M7.209 1.061c.725-.081 1.154-.081 1.933 0a6.57 6.57 0 0 1 3.65 1.82a100 100 0 0 0-1.986 1.93q-1.876-1.59-4.188-.734q-1.696.78-2.362 2.528a78 78 0 0 1-2.148-1.658a.26.26 0 0 0-.16-.027q1.683-3.245 5.26-3.86"
          opacity={0.987}
        />
        <path
          fill="#FFC107"
          d="M1.946 4.92q.085-.013.161.027a78 78 0 0 0 2.148 1.658A7.6 7.6 0 0 0 4.04 7.99q.037.678.215 1.331L2 11.116Q.527 8.038 1.946 4.92"
          opacity={0.997}
        />
        <path
          fill="#448AFF"
          d="M12.685 13.29a26 26 0 0 0-2.202-1.74q1.15-.812 1.396-2.228H8.122V6.713q3.25-.027 6.497.055q.616 3.345-1.423 6.032a7 7 0 0 1-.51.49"
          opacity={0.999}
        />
        <path
          fill="#43A047"
          d="M4.255 9.322q1.23 3.057 4.51 2.854a3.94 3.94 0 0 0 1.718-.626q1.148.812 2.202 1.74a6.62 6.62 0 0 1-4.027 1.684a6.4 6.4 0 0 1-1.02 0Q3.82 14.524 2 11.116z"
          opacity={0.993}
        />
      </g>
    </svg>
  );
}

GoogleIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

// ==========================================
// 2. Bing / Copilot AI SVG
// ==========================================
export function BingIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M3.5 2.5v19l6.5-3.5 5 3.5v-7.5l-5-3.5v-4.5l8 3.5 2-3.5L3.5 2.5z"
        fill="#008AD7"
      />
      <path
        d="M15 14v6.5l5-3.5V10.5L15 14z"
        fill="#00C4DF"
      />
      <path
        d="M3.5 2.5l6.5 3.5v5.5l-6.5-3.5V2.5z"
        fill="#0072BA"
      />
    </svg>
  );
}

BingIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

// ==========================================
// 3. Gemini SVG (Exact user-provided JSX)
// ==========================================
export function GeminiIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      className={className}
    >
      <path
        fill="#448aff"
        d="M15 8.014A7.457 7.457 0 0 0 8.014 15h-.028A7.456 7.456 0 0 0 1 8.014v-.028A7.456 7.456 0 0 0 7.986 1h.028A7.457 7.457 0 0 0 15 7.986z"
      />
    </svg>
  );
}

GeminiIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

// ==========================================
// 4. Perplexity SVG (Exact user-provided JSX)
// ==========================================
export function PerplexityIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
    >
      <path
        d="M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z"
        fill="#22B8CD"
        fillRule="nonzero"
      />
    </svg>
  );
}

PerplexityIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

// ==========================================
// 5. Grok AI SVG (Exact user-provided JSX)
// ==========================================
export function GrokIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      fill="currentColor"
    >
      <path d="M18.542 30.532l15.956-11.776c.783-.576 1.902-.354 2.274.545 1.962 4.728 1.084 10.411-2.819 14.315-3.903 3.901-9.333 4.756-14.299 2.808l-5.423 2.511c7.778 5.315 17.224 4 23.125-1.903 4.682-4.679 6.131-11.058 4.775-16.812l.011.011c-1.966-8.452.482-11.829 5.501-18.735C47.759 1.332 47.88 1.166 48 1l-6.602 6.599V7.577l-22.86 22.958M15.248 33.392c-5.582-5.329-4.619-13.579.142-18.339 3.521-3.522 9.294-4.958 14.331-2.847l5.412-2.497c-.974-.704-2.224-1.46-3.659-1.994-6.478-2.666-14.238-1.34-19.505 3.922C6.904 16.701 5.31 24.488 8.045 31.133c2.044 4.965-1.307 8.48-4.682 12.023C2.164 44.411.967 45.67 0 47l15.241-13.608" />
    </svg>
  );
}

GrokIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

// Provider Icon Selector
export function ProviderIcon({ id, className = "w-4 h-4", size = 16 }) {
  const iconMap = {
    google: GoogleIcon,
    bing: BingIcon,
    gemini: GeminiIcon,
    perplexity: PerplexityIcon,
    grok: GrokIcon,
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
// 6. Chat Icon (Exact user-provided JSX)
// ==========================================
export function ChatIcon({ className = "w-5 h-5", size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M4 12C4 7.58172 7.58172 4 12 4V4C16.4183 4 20 7.58172 20 12V17.0909C20 17.9375 20 18.3608 19.8739 18.6989C19.6712 19.2425 19.2425 19.6712 18.6989 19.8739C18.3608 20 17.9375 20 17.0909 20H12C7.58172 20 4 16.4183 4 12V12Z"
        stroke="currentColor"
        strokeWidth={2}
      />
      <path
        d="M9 11L15 11"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15H15"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

ChatIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

// ==========================================
// 7. Element Selector / Scan SVG (Exact user-provided JSX)
// ==========================================
export function ElementSelectorIcon({ className = "w-5 h-5", size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <line
        x1={3}
        y1={12}
        x2={21}
        y2={12}
        stroke="#2CA9BC"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <path
        d="M3 7V4A1 1 0 0 1 4 3H7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <path
        d="M21 7V4a1 1 0 0 0-1-1H17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <path
        d="M3 17v3a1 1 0 0 0 1 1H7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <path
        d="M21 17v3a1 1 0 0 1-1 1H17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

ElementSelectorIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

// ==========================================
// 8. Diamond Move / Drag Icon (Matching screenshot)
// ==========================================
export function DiamondMoveIcon({ className = "w-4 h-4", size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect
        x="12"
        y="2"
        width="14.14"
        height="14.14"
        rx="2"
        transform="rotate(45 12 2)"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 7V17M7 12H17M12 7L10 9M12 7L14 9M12 17L10 15M12 17L14 15M7 12L9 10M7 12L9 14M17 12L15 10M17 12L15 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

DiamondMoveIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

// ==========================================
// 9. Navigation & Utility UI Icons
// ==========================================
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
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 7V12L15.5 14"
        stroke="currentColor"
        strokeWidth="2"
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
        strokeWidth="2"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

SettingsIcon.propTypes = { className: PropTypes.string, size: PropTypes.number };

export function DragHandleIcon({ className = "w-5 h-5", size = 20 }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="6" r="2.2" />
      <circle cx="16" cy="6" r="2.2" />
      <circle cx="8" cy="12" r="2.2" />
      <circle cx="16" cy="12" r="2.2" />
      <circle cx="8" cy="18" r="2.2" />
      <circle cx="16" cy="18" r="2.2" />
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
