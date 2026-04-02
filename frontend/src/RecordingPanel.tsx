import React from "react";

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
  generateSummary,
  processingSummary,
  processStatus,
  generatedSummary,
  generatedTranscript,
}: Props) {
  return (
    <div>
      <h2>Create Meeting</h2>

      <form onSubmit={handleCreateMeeting}>
        <div style={{ display: "flex", gap: "10px" }}>
          <input
            type="text"
            placeholder="Enter meeting title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              height: "32px",
              padding: "0 8px",
              fontSize: "13px",
              flex: 1,
            }}
          />

          <button
            type="submit"
            disabled={
              loadingMeeting || isRecording || isUploading || processingSummary
            }
            style={{
              height: "32px",
              padding: "0 10px",
              fontSize: "12px",
              lineHeight: "1",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {loadingMeeting ? "Creating..." : "Create"}
          </button>
        </div>
      </form>

      {meetingError && <p style={{ color: "red" }}>{meetingError}</p>}

      {createdMeeting && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Created Meeting</h3>

          <p>
            <strong>Title:</strong> {createdMeeting.title}
          </p>

          <div style={{ marginTop: "1rem" }}>
            {!isRecording ? (
              <button
                onClick={startRecording}
                disabled={loadingMeeting || isUploading || processingSummary}
              >
                Start Recording
              </button>
            ) : (
              <button onClick={stopRecording}>Stop Recording</button>
            )}
          </div>

          {recordingStatus && (
            <p style={{ marginTop: "0.75rem" }}>{recordingStatus}</p>
          )}
          {uploadStatus && (
            <p style={{ marginTop: "0.75rem" }}>{uploadStatus}</p>
          )}
          {processStatus && (
            <p style={{ marginTop: "0.75rem" }}>{processStatus}</p>
          )}

          {audioUrl && (
            <div style={{ marginTop: "1rem" }}>
              <audio controls src={audioUrl}></audio>
            </div>
          )}

          {audioBlob && (
            <div style={{ marginTop: "1rem" }}>
              <button
                onClick={uploadAudio}
                disabled={isUploading || processingSummary}
              >
                {isUploading ? "Uploading..." : "Upload Audio"}
              </button>
            </div>
          )}

          {uploadStatus && <p>{uploadStatus}</p>}
          {processStatus && <p>{processStatus}</p>}

          {uploadStatus === "Upload successful" && (
            <div style={{ marginTop: "1rem" }}>
              <button
                onClick={generateSummary}
                disabled={processingSummary || isUploading}
              >
                {processingSummary ? "Processing..." : "Generate Summary"}
              </button>
            </div>
          )}

          {generatedSummary && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Generated Summary</h3>
              <p>{generatedSummary}</p>
            </div>
          )}

          {generatedTranscript && (
            <div style={{ marginTop: "1rem" }}>
              <h3>Transcript</h3>
              <p>{generatedTranscript}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
