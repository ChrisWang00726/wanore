import React, { useEffect } from "react";

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
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  handleCreateMeeting: (e: React.FormEvent) => void;
  loadingMeeting: boolean;
  meetingError: string;

  createdMeeting: MeetingResponse | null;

  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  recordingStatus: string;

  audioUrl: string;
  audioBlob: Blob | null;

  uploadAudio: () => void;
  isUploading: boolean;
  uploadStatus: string;

  generateSummary: () => void;
  processingSummary: boolean;
  processStatus: string;

  generatedSummary: string;
  generatedTranscript: string;
};

export default function RecordingPanel({
  title,
  setTitle,
  handleCreateMeeting,
  loadingMeeting,
  meetingError,
  createdMeeting,
  isRecording,
  startRecording,
  stopRecording,
  recordingStatus,
  audioUrl,
  audioBlob,
  uploadAudio,
  isUploading,
  uploadStatus,
  processingSummary,
  processStatus,
  generatedSummary,
  generatedTranscript,
}: Props) {
  useEffect(() => {
    if (
      audioBlob &&
      createdMeeting &&
      !createdMeeting.audio_url &&
      !isUploading
    ) {
      uploadAudio();
    }
  }, [audioBlob, createdMeeting, isUploading, uploadAudio]);

  return (
    <div
      style={{
        padding: "32px 24px 20px 24px",
        color: "white",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ marginBottom: "24px" }}>
        <h1
          style={{
            margin: 0,
            color: "white",
            fontSize: "28px",
            fontWeight: 600,
          }}
        >
          Wanore
        </h1>
        <p
          style={{
            margin: "4px 0 0 0",
            color: "#94a3b8",
            fontSize: "12px",
            fontWeight: 500,
            letterSpacing: "0.5px",
          }}
        >
          Snapshots
        </p>
      </div>

      <div
        style={{
          height: "1px",
          background: "#94a3b8",
          opacity: 0.3,
          margin: "20px -24px 24px -24px",
        }}
      />

      <h2
        style={{
          margin: "0 0 12px 0",
          color: "white",
          fontSize: "22px",
          fontWeight: 600,
        }}
      >
        New Snapshot
      </h2>

      <form onSubmit={handleCreateMeeting}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            placeholder="Meeting name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              height: "36px",
              padding: "0 10px",
              fontSize: "13px",
              borderRadius: "10px",
              background: "#f1f5f9",
              color: "#0f2233",
              border: "none",
              flex: 1,
            }}
          />

          <button
            type="submit"
            disabled={
              loadingMeeting || isRecording || isUploading || processingSummary
            }
            style={{
              height: "36px",
              padding: "0 14px",
              borderRadius: "10px",
              border: "none",
              background: "#8bb8c7",
              color: "#0f2233",
              fontWeight: 500,
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {loadingMeeting ? "Creating..." : "Create"}
          </button>
        </div>
      </form>

      {meetingError && (
        <p style={{ marginTop: "10px", color: "#dc2626" }}>{meetingError}</p>
      )}

      {createdMeeting && (
        <div style={{ marginTop: "20px" }}>
          <p style={{ margin: 0, color: "white" }}>{createdMeeting.title}</p>

          <div style={{ marginTop: "16px" }}>
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={loadingMeeting || isUploading || processingSummary}
                style={{
                  height: "36px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#8bb8c7",
                  color: "#0f2233",
                  fontWeight: 500,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                style={{
                  height: "36px",
                  padding: "0 14px",
                  borderRadius: "10px",
                  border: "none",
                  background: "#8bb8c7",
                  color: "#0f2233",
                  fontWeight: 500,
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Stop Recording
              </button>
            )}
          </div>
          {isRecording && (
            <p
              style={{
                marginTop: "10px",
                fontSize: "12px",
                color: "#94a3b8",
                lineHeight: 1.4,
              }}
            >
              Please do not reload or close the page while recording or
              uploading.
            </p>
          )}

          {recordingStatus && (
            <p
              style={{ marginTop: "12px", color: "#94a3b8", fontSize: "13px" }}
            >
              {recordingStatus}
            </p>
          )}

          {audioUrl && (
            <div style={{ marginTop: "12px", maxWidth: "100%" }}>
              <audio
                controls
                src={audioUrl}
                style={{
                  width: "100%",
                  height: "32px",
                }}
              />
            </div>
          )}

          {/* {audioBlob && !createdMeeting.audio_url && (
            <p
              style={{ marginTop: "12px", fontSize: "13px", color: "#94a3b8" }}
            >
              {isUploading ? "Uploading audio..." : "Preparing upload..."}
            </p>
          )} */}

          {uploadStatus && (
            <p
              style={{
                marginTop: "12px",
                fontSize: "13px",
                color:
                  uploadStatus === "Upload successful" ? "#8bb8c7" : "#94a3b8",
              }}
            >
              {uploadStatus}
            </p>
          )}

          {processStatus && (
            <p
              style={{
                marginTop: "12px",
                fontSize: "13px",
                color:
                  processStatus === "Summary generated successfully"
                    ? "#8bb8c7"
                    : "#94a3b8",
              }}
            >
              {processStatus}
            </p>
          )}

          {generatedSummary && (
            <div style={{ marginTop: "20px" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "white" }}>
                Generated Summary
              </h3>
              <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.6 }}>
                {generatedSummary}
              </p>
            </div>
          )}

          {generatedTranscript && (
            <div style={{ marginTop: "20px" }}>
              <h3 style={{ margin: "0 0 10px 0", color: "white" }}>
                Transcript
              </h3>
              <p style={{ margin: 0, color: "#94a3b8", lineHeight: 1.6 }}>
                {generatedTranscript}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
