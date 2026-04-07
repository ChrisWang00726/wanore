type MeetingResponse = {
  id: string;
  owner_user_id: string;
  title: string;
  summary: string | null;
  transcript?: string | null;
  audio_url?: string | null;
  created_at: string;
  updated_at: string;
};

type Props = {
  meeting: MeetingResponse | null;
  normalizeAudioUrl: (url?: string | null) => string | null;
  shareEmail: string;
  setShareEmail: (value: string) => void;
  shareMeeting: () => void;
  shareStatus: string;
  isSharing: boolean;
};

type SummarySections = {
  goingOn: string[];
  done: string[];
  blocked: string[];
  next: string[];
};

function parseSummarySections(summary?: string | null): SummarySections {
  const sections: SummarySections = {
    goingOn: [],
    done: [],
    blocked: [],
    next: [],
  };

  if (!summary?.trim()) return sections;

  const lines = summary
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const splitIntoItems = (text: string) =>
    text
      .split(/;\s+|,\s+(?=[A-Z])/)
      .map((item) => item.trim())
      .filter(Boolean);

  const extractAfterColon = (text: string) => {
    const colonIndex = text.indexOf(":");
    if (colonIndex === -1) return "";
    return text.slice(colonIndex + 1).trim();
  };

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.startsWith("what's going on:") ||
      lower.startsWith("whats going on:") ||
      lower.startsWith("what is going on:")
    ) {
      sections.goingOn.push(...splitIntoItems(extractAfterColon(line)));
      continue;
    }

    if (
      lower.startsWith("what's done:") ||
      lower.startsWith("whats done:") ||
      lower.startsWith("what is done:")
    ) {
      sections.done.push(...splitIntoItems(extractAfterColon(line)));
      continue;
    }

    if (
      lower.startsWith("what's blocked:") ||
      lower.startsWith("whats blocked:") ||
      lower.startsWith("what is blocked:")
    ) {
      sections.blocked.push(...splitIntoItems(extractAfterColon(line)));
      continue;
    }

    if (
      lower.startsWith("what's next:") ||
      lower.startsWith("whats next:") ||
      lower.startsWith("what happens next:") ||
      lower.startsWith("next steps:")
    ) {
      sections.next.push(...splitIntoItems(extractAfterColon(line)));
      continue;
    }
  }

  return sections;
}

function renderItems(
  items: string[],
  emptyText: string,
  icon: string,
  iconColor: string,
) {
  if (items.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          color: "#6b7280",
          lineHeight: 1.75,
          fontSize: "14px",
        }}
      >
        {emptyText}
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "flex-start",
          }}
        >
          <span
            style={{
              color: iconColor,
              fontSize: "16px",
              lineHeight: 1.3,
              marginTop: "1px",
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <p
            style={{
              margin: 0,
              color: "#16324f",
              lineHeight: 1.7,
              fontSize: "14px",
              fontWeight: 400,
            }}
          >
            {item}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function MeetingView({
  meeting,
  normalizeAudioUrl,
  shareEmail,
  setShareEmail,
  shareMeeting,
  shareStatus,
  isSharing,
}: Props) {
  if (!meeting) {
    return (
      <div
        style={{
          background: "#f6f6f3",
          border: "1px solid #ecece5",
          borderRadius: "24px",
          padding: "28px 30px",
          color: "#111827",
          boxShadow: "0 10px 24px rgba(15, 39, 66, 0.06)",
        }}
      >
        <p style={{ margin: 0, color: "#6b7280", fontSize: "15px" }}>
          Select a meeting to view details
        </p>
      </div>
    );
  }

  const summarySections = parseSummarySections(meeting.summary);

  const hasStructuredSections =
    summarySections.goingOn.length > 0 ||
    summarySections.done.length > 0 ||
    summarySections.blocked.length > 0 ||
    summarySections.next.length > 0;

  const cardStyle: React.CSSProperties = {
    background: "#f6f6f3",
    border: "1px solid #ecece5",
    borderRadius: "24px",
    padding: "32px 36px",
    color: "#111827",
    boxShadow: "0 10px 24px rgba(15, 39, 66, 0.06)",
  };

  const sectionTitleStyle = {
    margin: "0 0 18px 0",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.03em",
    textTransform: "uppercase" as const,
    color: "#47627f",
  };

  const contentBlockStyle = {
    background: "#fbfbf8",
    border: "1px solid #ecece5",
    borderRadius: "14px",
    padding: "16px 18px",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "26px",
              fontWeight: 600,
              lineHeight: 1.2,
              color: "#0f2742",
              letterSpacing: "-0.01em",
              overflowWrap: "break-word",
            }}
          >
            {meeting.title.replace(/_/g, " ")}
          </h2>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              style={{
                height: "30px",
                padding: "0 8px",
                fontSize: "12px",
                border: "1px solid #e3e6ea",
                borderRadius: "6px",
                minWidth: "140px",
                background: "white",
                outline: "none",
              }}
            />

            <button
              onClick={shareMeeting}
              disabled={!shareEmail.trim() || isSharing}
              style={{
                height: "30px",
                padding: "0 10px",
                borderRadius: "6px",
                background: "#e9edf2",
                color: "#0f2742",
                fontSize: "12px",
                fontWeight: 500,
                border: "1px solid #e3e6ea",
                cursor:
                  !shareEmail.trim() || isSharing ? "not-allowed" : "pointer",
                opacity: !shareEmail.trim() || isSharing ? 0.5 : 1,
              }}
            >
              {isSharing ? "..." : "Share"}
            </button>
          </div>
        </div>

        {shareStatus && (
          <p
            style={{
              margin: "0 0 26px 0",
              color: "#5b6673",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            {shareStatus}
          </p>
        )}

        {hasStructuredSections ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: "40px",
            }}
          >
            <div>
              <h3 style={sectionTitleStyle}>What&apos;s Going On</h3>
              {renderItems(
                summarySections.goingOn,
                "No in-progress items found in summary",
                "•",
                "#7faebd",
              )}
            </div>

            <div>
              <h3 style={sectionTitleStyle}>What&apos;s Done</h3>
              {renderItems(
                summarySections.done,
                "No completed items found in summary",
                "✓",
                "#16a34a",
              )}
            </div>

            <div>
              <h3 style={sectionTitleStyle}>What&apos;s Blocked</h3>
              {renderItems(
                summarySections.blocked,
                "No blocked items found in summary",
                "!",
                "#ef4444",
              )}
            </div>

            <div>
              <h3 style={sectionTitleStyle}>What&apos;s Next</h3>
              {renderItems(
                summarySections.next,
                "No next steps found in summary",
                "→",
                "#7faebd",
              )}
            </div>
          </div>
        ) : (
          <div>
            <h3 style={sectionTitleStyle}>Summary</h3>
            <div style={contentBlockStyle}>
              <p
                style={{
                  margin: 0,
                  color: "#374151",
                  lineHeight: 1.75,
                  overflowWrap: "break-word",
                  whiteSpace: "pre-wrap",
                  fontSize: "14px",
                }}
              >
                {meeting.summary?.trim() ? meeting.summary : "No summary yet"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <h3
              style={{
                margin: "0 0 10px 0",
                fontSize: "18px",
                fontWeight: 700,
                color: "#0f2742",
              }}
            >
              Audio Recording
            </h3>

            <div style={contentBlockStyle}>
              {meeting.audio_url ? (
                <audio
                  controls
                  style={{ width: "100%" }}
                  src={normalizeAudioUrl(meeting.audio_url) || undefined}
                />
              ) : (
                <p
                  style={{
                    margin: 0,
                    color: "#6b7280",
                    lineHeight: 1.7,
                    fontSize: "14px",
                  }}
                >
                  No audio yet
                </p>
              )}
            </div>
          </div>

          <div>
            <h3
              style={{
                margin: "0 0 10px 0",
                fontSize: "18px",
                fontWeight: 700,
                color: "#0f2742",
              }}
            >
              Transcript
            </h3>

            <div style={contentBlockStyle}>
              <p
                style={{
                  margin: 0,
                  color: "#374151",
                  lineHeight: 1.75,
                  overflowWrap: "break-word",
                  whiteSpace: "pre-wrap",
                  fontSize: "14px",
                }}
              >
                {meeting.transcript?.trim()
                  ? meeting.transcript
                  : "No transcript yet"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
