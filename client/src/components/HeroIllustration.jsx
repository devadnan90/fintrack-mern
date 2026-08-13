export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 480 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-md"
      role="img"
      aria-label="Illustration of a finance dashboard with a bar chart, an upward trend line, and a spending summary card"
    >
      <defs>
        <linearGradient id="coinGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b5fd9" />
          <stop offset="100%" stopColor="#26399c" />
        </linearGradient>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b5fd9" />
          <stop offset="100%" stopColor="#6b8afc" />
        </linearGradient>
      </defs>

      {}
      <circle cx="240" cy="210" r="190" fill="#eef4ff" />
      <circle cx="90" cy="330" r="60" fill="#d9e6ff" opacity="0.6" />
      <circle cx="410" cy="90" r="45" fill="#d9e6ff" opacity="0.6" />

      {}
      <rect
        x="76"
        y="76"
        width="300"
        height="240"
        rx="20"
        fill="#c7d4f2"
        opacity="0.5"
      />

      {}
      <rect
        x="68"
        y="66"
        width="300"
        height="240"
        rx="20"
        fill="white"
        stroke="#e5e9f5"
        strokeWidth="1"
      />

      {}
      <circle cx="94" cy="92" r="5" fill="#f0abab" />
      <circle cx="112" cy="92" r="5" fill="#f3d597" />
      <circle cx="130" cy="92" r="5" fill="#a6dfb0" />

      {}
      <rect x="94" y="112" width="120" height="10" rx="5" fill="#dbe2f5" />
      <rect x="94" y="128" width="70" height="8" rx="4" fill="#e9edf9" />

      {}
      <rect
        x="94"
        y="230"
        width="26"
        height="56"
        rx="6"
        fill="url(#barGradient)"
      />
      <rect
        x="132"
        y="205"
        width="26"
        height="81"
        rx="6"
        fill="url(#barGradient)"
      />
      <rect
        x="170"
        y="245"
        width="26"
        height="41"
        rx="6"
        fill="url(#barGradient)"
      />
      <rect
        x="208"
        y="185"
        width="26"
        height="101"
        rx="6"
        fill="url(#barGradient)"
      />
      <rect
        x="246"
        y="215"
        width="26"
        height="71"
        rx="6"
        fill="url(#barGradient)"
      />
      <rect x="284" y="165" width="26" height="121" rx="6" fill="#2f4bc0" />

      {}
      <polyline
        points="107,225 145,195 183,235 221,170 259,205 297,150"
        fill="none"
        stroke="#0f172a"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [107, 225],
        [145, 195],
        [183, 235],
        [221, 170],
        [259, 205],
        [297, 150],
      ].map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          r="4"
          fill="white"
          stroke="#0f172a"
          strokeWidth="2"
        />
      ))}

      {}
      <g transform="translate(300, 40)">
        <rect
          width="140"
          height="56"
          rx="14"
          fill="white"
          stroke="#e5e9f5"
          strokeWidth="1"
        />
        <path
          d="M16 34 L24 22 L32 30 L42 16"
          stroke="#16a34a"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M36 16 H42 V22"
          stroke="#16a34a"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="54"
          y="24"
          fontSize="13"
          fontWeight="700"
          fill="#0f172a"
          fontFamily="sans-serif"
        >
          +24%
        </text>
        <text
          x="54"
          y="40"
          fontSize="10"
          fill="#64748b"
          fontFamily="sans-serif"
        >
          this month
        </text>
      </g>

      {}
      <g transform="translate(46, 300)">
        <circle r="34" fill="url(#coinGradient)" />
        <text
          x="0"
          y="8"
          fontSize="26"
          fontWeight="700"
          fill="white"
          textAnchor="middle"
          fontFamily="sans-serif"
        >
          $
        </text>
      </g>

      {}
      <circle cx="400" cy="240" r="5" fill="#6b8afc" />
      <circle cx="60" cy="120" r="4" fill="#a9bcf0" />
      <circle cx="420" cy="330" r="6" fill="#d9e6ff" />
    </svg>
  );
}
