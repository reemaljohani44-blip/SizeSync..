import { useTranslation } from "react-i18next";

type FitStatus = "perfect" | "good" | "loose" | "tight" | "neutral";

interface MeasurementOverlay {
  type: "chest" | "waist" | "hip";
  value?: number;
  fitStatus?: FitStatus;
  label?: string;
}

interface BodyAvatarProps {
  gender: "male" | "female" | "other";
  measurements?: {
    chest?: number;
    waist?: number;
    hip?: number;
    shoulder?: number;
    height?: number;
    weight?: number;
  };
  overlays?: MeasurementOverlay[];
  showLabels?: boolean;
  showPulse?: boolean;
  highlightRecommended?: "chest" | "waist" | "hip" | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const getFitColor = (status: FitStatus) => {
  switch (status) {
    case "perfect":
      return { bg: "#10B981", stroke: "#059669", text: "#ffffff" };
    case "good":
      return { bg: "#6366F1", stroke: "#4F46E5", text: "#ffffff" };
    case "loose":
      return { bg: "#F59E0B", stroke: "#D97706", text: "#ffffff" };
    case "tight":
      return { bg: "#EF4444", stroke: "#DC2626", text: "#ffffff" };
    default:
      return { bg: "#6B7280", stroke: "#4B5563", text: "#ffffff" };
  }
};

const sizeMap = {
  sm: { width: 140, height: 260 },
  md: { width: 180, height: 330 },
  lg: { width: 220, height: 400 },
};

export function BodyAvatar({
  gender,
  overlays = [],
  showLabels = true,
  showPulse = true,
  highlightRecommended,
  size = "md",
  className = "",
}: BodyAvatarProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { width, height } = sizeMap[size];

  const getOverlay = (type: "chest" | "waist" | "hip") => {
    return overlays.find(o => o.type === type);
  };

  const isFemale = gender === "female";

  const measurementPositions = {
    chest: { y: isFemale ? 95 : 90, labelY: isFemale ? 85 : 80 },
    waist: { y: isFemale ? 135 : 130, labelY: isFemale ? 125 : 120 },
    hip: { y: isFemale ? 170 : 165, labelY: isFemale ? 160 : 155 },
  };

  return (
    <div className={`relative flex flex-col items-center ${className}`} dir={isRTL ? "rtl" : "ltr"}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 180 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        <defs>
          <linearGradient id="bodyFill" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
          
          <linearGradient id="skinHighlight" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#64748B" stopOpacity="0" />
          </linearGradient>

          <filter id="bodyShadow" x="-10%" y="-5%" width="120%" height="110%">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodColor="#1E293B" floodOpacity="0.25" />
          </filter>

          <style>
            {`
              @keyframes gentlePulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
              }
              .pulse-ring {
                animation: gentlePulse 2s ease-in-out infinite;
              }
            `}
          </style>
        </defs>

        <g filter="url(#bodyShadow)">
          {isFemale ? (
            <g className="female-body">
              <ellipse cx="90" cy="28" rx="16" ry="20" fill="url(#bodyFill)" />
              <ellipse cx="88" cy="26" rx="8" ry="10" fill="url(#skinHighlight)" />
              
              <path
                d="M90 48 
                   C90 48 78 50 74 52
                   L68 54 C64 56 60 60 58 70
                   L52 78 C48 82 46 90 48 100
                   C50 108 54 112 60 114
                   L64 100 C66 88 68 82 70 78
                   C72 86 70 100 68 120
                   C66 140 62 155 58 170
                   C56 180 56 195 58 210
                   L62 250 C64 270 66 290 70 310
                   L82 310 C84 290 85 270 86 250
                   L88 220 C89 200 90 190 90 185
                   C90 190 91 200 92 220
                   L94 250 C95 270 96 290 98 310
                   L110 310 C114 290 116 270 118 250
                   L122 210 C124 195 124 180 122 170
                   C118 155 114 140 112 120
                   C110 100 108 86 110 78
                   C112 82 114 88 116 100
                   L120 114 C126 112 130 108 132 100
                   C134 90 132 82 128 78
                   L122 70 C120 60 116 56 112 54
                   L106 52 C102 50 90 48 90 48 Z"
                fill="url(#bodyFill)"
              />
              <path
                d="M78 52 C82 50 88 49 90 49 C92 49 98 50 102 52
                   C98 54 94 55 90 55 C86 55 82 54 78 52 Z"
                fill="url(#skinHighlight)"
              />
              <path
                d="M70 75 C74 78 82 82 90 82 C98 82 106 78 110 75
                   L108 85 C104 90 98 94 90 94 C82 94 76 90 72 85 Z"
                fill="url(#skinHighlight)"
                opacity="0.3"
              />
            </g>
          ) : (
            <g className="male-body">
              <ellipse cx="90" cy="26" rx="15" ry="19" fill="url(#bodyFill)" />
              <ellipse cx="88" cy="24" rx="7" ry="9" fill="url(#skinHighlight)" />
              
              <path
                d="M90 45 
                   C90 45 76 47 70 50
                   L62 54 C56 58 50 66 48 78
                   L40 88 C34 96 32 108 36 120
                   C40 130 46 134 54 134
                   L60 110 C62 94 64 86 68 80
                   C70 92 70 106 70 125
                   C70 145 70 158 70 172
                   C70 185 72 200 74 215
                   L78 255 C80 275 82 295 84 315
                   L94 315 C95 295 96 275 96 255
                   L97 220 C97 200 97 188 97 180
                   C97 188 97 200 97 220
                   L98 255 C98 275 99 295 100 315
                   L110 315 C112 295 114 275 116 255
                   L120 215 C122 200 124 185 124 172
                   C124 158 124 145 124 125
                   C124 106 124 92 126 80
                   C130 86 132 94 134 110
                   L140 134 C148 134 154 130 158 120
                   C162 108 160 96 154 88
                   L146 78 C144 66 138 58 132 54
                   L124 50 C118 47 90 45 90 45 Z"
                fill="url(#bodyFill)"
              />
              <path
                d="M76 48 C82 46 88 45 90 45 C92 45 98 46 104 48
                   C98 52 94 53 90 53 C86 53 82 52 76 48 Z"
                fill="url(#skinHighlight)"
              />
              <path
                d="M68 78 C76 82 84 85 90 85 C96 85 104 82 112 78
                   L110 90 C104 96 98 100 90 100 C82 100 76 96 70 90 Z"
                fill="url(#skinHighlight)"
                opacity="0.3"
              />
            </g>
          )}
        </g>

        {overlays.length > 0 && overlays.map((overlay) => {
          const colors = getFitColor(overlay.fitStatus || "neutral");
          const isHighlighted = highlightRecommended === overlay.type;
          const pos = measurementPositions[overlay.type];
          
          return (
            <g key={overlay.type}>
              {isHighlighted && showPulse && (
                <ellipse
                  cx="90"
                  cy={pos.y}
                  rx="42"
                  ry="12"
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="2"
                  opacity="0.4"
                  className="pulse-ring"
                />
              )}
              
              <ellipse
                cx="90"
                cy={pos.y}
                rx="38"
                ry="10"
                fill={colors.bg}
                stroke={colors.stroke}
                strokeWidth="2"
                opacity="0.85"
              />
              
              {showLabels && (
                <text
                  x="90"
                  y={pos.y + 4}
                  textAnchor="middle"
                  fill={colors.text}
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="'Cairo', 'Inter', sans-serif"
                >
                  {overlay.label || t(`measurements.${overlay.type}`)}
                  {overlay.value ? ` ${overlay.value}` : ""}
                </text>
              )}
            </g>
          );
        })}

        {overlays.length === 0 && showLabels && (
          <>
            <g>
              <line
                x1="130"
                y1={measurementPositions.chest.y}
                x2="155"
                y2={measurementPositions.chest.labelY}
                stroke="#6B7280"
                strokeWidth="1"
                strokeDasharray="3,2"
              />
              <circle cx="155" cy={measurementPositions.chest.labelY} r="3" fill="#6B7280" />
              <text
                x={isRTL ? "148" : "162"}
                y={measurementPositions.chest.labelY + 4}
                textAnchor={isRTL ? "end" : "start"}
                fill="#374151"
                fontSize="11"
                fontWeight="500"
                fontFamily="'Cairo', 'Inter', sans-serif"
              >
                {t("measurements.chest")}
              </text>
            </g>

            <g>
              <line
                x1="120"
                y1={measurementPositions.waist.y}
                x2="155"
                y2={measurementPositions.waist.labelY}
                stroke="#6B7280"
                strokeWidth="1"
                strokeDasharray="3,2"
              />
              <circle cx="155" cy={measurementPositions.waist.labelY} r="3" fill="#6B7280" />
              <text
                x={isRTL ? "148" : "162"}
                y={measurementPositions.waist.labelY + 4}
                textAnchor={isRTL ? "end" : "start"}
                fill="#374151"
                fontSize="11"
                fontWeight="500"
                fontFamily="'Cairo', 'Inter', sans-serif"
              >
                {t("measurements.waist")}
              </text>
            </g>

            <g>
              <line
                x1="125"
                y1={measurementPositions.hip.y}
                x2="155"
                y2={measurementPositions.hip.labelY}
                stroke="#6B7280"
                strokeWidth="1"
                strokeDasharray="3,2"
              />
              <circle cx="155" cy={measurementPositions.hip.labelY} r="3" fill="#6B7280" />
              <text
                x={isRTL ? "148" : "162"}
                y={measurementPositions.hip.labelY + 4}
                textAnchor={isRTL ? "end" : "start"}
                fill="#374151"
                fontSize="11"
                fontWeight="500"
                fontFamily="'Cairo', 'Inter', sans-serif"
              >
                {t("measurements.hip")}
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

export function BodyAvatarLegend({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  
  const statuses: { key: FitStatus; label: string }[] = [
    { key: "perfect", label: t("fitStatus.perfect") },
    { key: "good", label: t("fitStatus.good") },
    { key: "loose", label: t("fitStatus.loose") },
    { key: "tight", label: t("fitStatus.tight") },
  ];

  return (
    <div className={`flex flex-wrap justify-center gap-3 ${className}`}>
      {statuses.map(({ key, label }) => {
        const colors = getFitColor(key);
        return (
          <div key={key} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border-2"
              style={{ backgroundColor: colors.bg, borderColor: colors.stroke }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
