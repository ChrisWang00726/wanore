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
  meetings: {
    owned: MeetingResponse[];
    shared: MeetingResponse[];
  };
  onSelect: (id: string) => void;
  selectedMeetingId: string | null;
};

export default function MeetingList({
  meetings,
  onSelect,
  selectedMeetingId,
}: Props) {
  return (
    <div
      style={{
        padding: "24px",
        color: "white",
        flex: 1,
        overflowY: "auto",
      }}
    >
      {/* OWNED */}
      <h3
        style={{
          margin: "0 0 10px 0",
          fontSize: "12px",
          fontWeight: 500,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Owned
      </h3>

      <div style={{ marginBottom: "16px" }}>
        {meetings.owned.length === 0 && (
          <p style={{ color: "#9ca3af", margin: 0 }}>No meetings yet</p>
        )}

        {meetings.owned.map((m) => (
          <div
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              padding: "14px 16px",
              borderRadius: "16px",
              cursor: "pointer",
              marginBottom: "10px",
              background:
                selectedMeetingId === m.id ? "#8bb8c7" : "transparent",
              border: "none",
              color: selectedMeetingId === m.id ? "#0f2233" : "white",
              transition: "all 0.2s ease",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                {m.title}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: selectedMeetingId === m.id ? "#35576a" : "#94a3b8",
                }}
              >
                {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SHARED */}
      <h3
        style={{
          margin: "0 0 10px 0",
          fontSize: "12px",
          fontWeight: 500,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Shared
      </h3>

      <div>
        {meetings.shared.length === 0 && (
          <p style={{ color: "#94a3b8", margin: 0 }}>No shared meetings</p>
        )}

        {meetings.shared.map((m) => (
          <div
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              padding: "14px 16px",
              borderRadius: "16px",
              cursor: "pointer",
              marginBottom: "10px",
              background:
                selectedMeetingId === m.id ? "#8bb8c7" : "transparent",
              border: "none",
              color: selectedMeetingId === m.id ? "#0f2233" : "white",
              transition: "all 0.2s ease",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                {m.title}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: selectedMeetingId === m.id ? "#35576a" : "#94a3b8",
                }}
              >
                {new Date(m.created_at).toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
