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
    return <p>Select a meeting to view details</p>;
  }

  return (
    <div>
      <h2>{meeting.title}</h2>

      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          gap: "8px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Enter email to share"
          value={shareEmail}
          onChange={(e) => setShareEmail(e.target.value)}
          style={{
            height: "32px",
            padding: "0 8px",
            fontSize: "13px",
            minWidth: "260px",
          }}
        />
        <button
          onClick={shareMeeting}
          disabled={!shareEmail.trim() || isSharing}
        >
          {isSharing ? "Sharing..." : "Share"}
        </button>
      </div>

      {shareStatus && <p>{shareStatus}</p>}

      <h3>Summary</h3>
      <p style={{ overflowWrap: "break-word" }}>
        {meeting.summary?.trim() ? meeting.summary : "No summary yet"}
      </p>

      <h3>Transcript</h3>
      <p style={{ overflowWrap: "break-word" }}>
        {meeting.transcript?.trim() ? meeting.transcript : "No transcript yet"}
      </p>

      {meeting.audio_url && (
        <div style={{ marginTop: "1rem" }}>
          <audio
            controls
            src={normalizeAudioUrl(meeting.audio_url) || undefined}
          />
        </div>
      )}
    </div>
  );
}
