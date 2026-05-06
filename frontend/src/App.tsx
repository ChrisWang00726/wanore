import { useEffect, useRef, useState } from "react";
import MeetingList from "./MeetingList";
import MeetingView from "./MeetingView";
import RecordingPanel from "./RecordingPanel";

declare global {
  interface Window {
    google: any;
  }
}

type LoginResponse = {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
  name: string;
};

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

export default function App() {
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [title, setTitle] = useState("");
  const [meetingError, setMeetingError] = useState("");
  const [createdMeeting, setCreatedMeeting] = useState<MeetingResponse | null>(
    null,
  );
  const [loadingMeeting, setLoadingMeeting] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [processStatus, setProcessStatus] = useState("");
  const [generatedTranscript, setGeneratedTranscript] = useState("");
  const [generatedSummary, setGeneratedSummary] = useState("");
  const [processingSummary, setProcessingSummary] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [shareEmail, setShareEmail] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("access_token"),
  );

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  type MeetingsState = {
    owned: MeetingResponse[];
    shared: MeetingResponse[];
  };

  const [meetings, setMeetings] = useState<MeetingsState>({
    owned: [],
    shared: [],
  });

  const [selectedMeeting, setSelectedMeeting] =
    useState<MeetingResponse | null>(null);

  const activeMeeting = createdMeeting || selectedMeeting;

  useEffect(() => {
    function renderGoogleButton() {
      const el = document.getElementById("googleSignInDiv");
      if (!el || !window.google) return;

      el.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
      });

      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
      });
    }

    if (window.google) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;

    document.body.appendChild(script);
  }, [isLoggedIn]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    async function loadUser() {
      try {
        const res = await fetch(`${API_BASE_URL}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          localStorage.removeItem("access_token");
          setIsLoggedIn(false);
          setUserEmail("");
          return;
        }

        setUserEmail(data.email || "");
        setIsLoggedIn(true);
        await fetchMeetings();
      } catch (error) {
        localStorage.removeItem("access_token");
        setIsLoggedIn(false);
        setUserEmail("");
      }
    }

    loadUser();
  }, []);

  async function shareMeeting() {
    try {
      if (!selectedMeeting) {
        throw new Error("No meeting selected");
      }

      const trimmedEmail = shareEmail.trim();
      if (!trimmedEmail) {
        throw new Error("Email is required");
      }

      const token = getToken();
      setIsSharing(true);
      setShareStatus("Sharing...");

      const response = await fetch(
        `${API_BASE_URL}/meetings/${selectedMeeting.id}/share`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: trimmedEmail,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Share failed");
      }

      setShareStatus(data.message || "Shared successfully");
      setShareEmail("");
      await fetchMeetings();
    } catch (err: any) {
      console.error(err);
      setShareStatus(err.message || "Share failed");
    } finally {
      setIsSharing(false);
    }
  }

  async function handleCredentialResponse(response: any) {
    try {
      resetAppState();
      setUserEmail("");
      //setMessage("Logging in...");

      const res = await fetch(`${API_BASE_URL}/auth/google`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_token: response.credential,
        }),
      });

      const data: LoginResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as any).detail || "Login failed");
      }

      localStorage.setItem("access_token", data.access_token);
      const meRes = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
        },
      });

      const meData = await meRes.json();

      if (!meRes.ok) {
        throw new Error(meData.detail || "Failed to fetch /me");
      }

      console.log("/me success:", meData);
      console.log("Stored backend token:", data.access_token);
      console.log(
        "Stored in localStorage:",
        localStorage.getItem("access_token"),
      );

      setCreatedMeeting(null);
      setSelectedMeeting(null);
      setMeetings({
        owned: [],
        shared: [],
      });

      setUserEmail(data.email);
      setIsLoggedIn(true);
      setMessage("");
      await fetchMeetings();
    } catch (error: any) {
      console.error(error);
      setMessage(error.message || "Login failed");
    }
  }

  function resetAppState() {
    setCreatedMeeting(null);
    setSelectedMeeting(null);

    setMeetings({
      owned: [],
      shared: [],
    });

    setTitle("");
    setMeetingError("");

    setIsRecording(false);
    setRecordingStatus("");
    setAudioUrl("");
    setAudioBlob(null);
    setUploadStatus("");
    setProcessStatus("");
    setGeneratedTranscript("");
    setGeneratedSummary("");
    setProcessingSummary(false);
    setIsUploading(false);

    setShareEmail("");
    setShareStatus("");
    setIsSharing(false);
  }

  function handleLogout() {
    localStorage.removeItem("access_token");

    if (window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
    }

    resetAppState();
    setUserEmail("");
    setMessage("");
    setIsLoggedIn(false);
  }

  async function handleCreateMeeting(e: React.FormEvent) {
    e.preventDefault();
    setMeetingError("");
    setCreatedMeeting(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setMeetingError("Title is required");
      return;
    }

    try {
      setLoadingMeeting(true);

      const token = getToken();

      const response = await fetch(`${API_BASE_URL}/meetings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: trimmedTitle,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to create meeting");
      }

      setShareEmail("");
      setShareStatus("");
      setCreatedMeeting(data);
      setSelectedMeeting(null);
      await fetchMeetings();

      setTitle("");
      setRecordingStatus("");
      setAudioUrl("");
      setAudioBlob(null);
      setUploadStatus("");
      setProcessStatus("");
      setGeneratedTranscript("");
      setGeneratedSummary("");
      setMessage("");
    } catch (err: any) {
      console.error(err);
      setMeetingError(err.message || "Failed to create meeting");
    } finally {
      setLoadingMeeting(false);
    }
  }

  async function startRecording() {
    try {
      setGeneratedSummary("");
      setGeneratedTranscript("");
      setProcessStatus("");
      setUploadStatus("");
      setAudioUrl("");
      setAudioBlob(null);

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const displayAudioTracks = displayStream.getAudioTracks();

      if (displayAudioTracks.length === 0) {
        micStream.getTracks().forEach((track) => track.stop());
        displayStream.getTracks().forEach((track) => track.stop());

        throw new Error(
          "No meeting audio was captured. Choose the meeting browser tab and enable 'Share tab audio'.",
        );
      }

      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);

      const displayAudioStream = new MediaStream(displayAudioTracks);
      const displaySource =
        audioContext.createMediaStreamSource(displayAudioStream);
      displaySource.connect(destination);

      const mixedStream = destination.stream;

      streamRef.current = new MediaStream([
        ...micStream.getTracks(),
        ...displayStream.getTracks(),
      ]);

      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(mixedStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "audio/webm",
        });

        setAudioBlob(blob);

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        micStream.getTracks().forEach((track) => track.stop());
        displayStream.getTracks().forEach((track) => track.stop());
        audioContext.close();
        streamRef.current = null;

        console.log("blob type:", blob.type);
        console.log("MediaRecorder mimeType:", mediaRecorder.mimeType);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error: any) {
      console.error("startRecording error:", error);
      setRecordingStatus(
        `Could not start recording: ${error?.message || "unknown error"}`,
      );
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) {
      return;
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);
  }

  async function uploadAudio() {
    try {
      if (!activeMeeting) {
        throw new Error("No meeting selected");
      }

      if (!audioBlob) {
        throw new Error("No audio recording available");
      }

      const token = getToken();

      setIsUploading(true);
      setUploadStatus("Uploading audio...");

      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      const response = await fetch(
        `${API_BASE_URL}/meetings/${activeMeeting.id}/upload-audio`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Upload failed");
      }

      setUploadStatus("Upload successful");

      await fetchMeetings();
      await loadMeeting(activeMeeting.id);
    } catch (error: any) {
      console.error(error);
      setUploadStatus(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  async function generateSummary() {
    try {
      if (!activeMeeting) {
        throw new Error("No meeting selected");
      }

      const token = getToken();

      setProcessingSummary(true);
      setProcessStatus("Processing audio... (~30s)");
      setGeneratedTranscript("");
      setGeneratedSummary("");

      const response = await fetch(
        `${API_BASE_URL}/meetings/${activeMeeting.id}/process-audio`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to process audio");
      }

      setProcessStatus("Summary generated successfully");

      await fetchMeetings();
      await loadMeeting(activeMeeting.id);
    } catch (error: any) {
      console.error(error);
      setProcessStatus(error.message || "Processing failed");
    } finally {
      setProcessingSummary(false);
    }
  }

  async function fetchMeetings() {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/meetings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (res.ok) {
      setMeetings(data);
    }
  }

  async function fetchPlayableAudioUrl(meetingId: string) {
    const token = getToken();

    const res = await fetch(`${API_BASE_URL}/meetings/${meetingId}/audio-url`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Failed to fetch audio URL");
    }

    return data.audio_url as string;
  }

  async function loadMeeting(id: string) {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const res = await fetch(`${API_BASE_URL}/meetings/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const fullMeeting = await res.json();

    if (res.ok) {
      let playableAudioUrl: string | null = null;

      if (fullMeeting.audio_url) {
        try {
          playableAudioUrl = await fetchPlayableAudioUrl(id);
        } catch (error) {
          console.error("Failed to load playable audio URL:", error);
        }
      }

      setCreatedMeeting(null);
      setShareEmail("");
      setShareStatus("");
      setGeneratedSummary("");
      setGeneratedTranscript("");
      setProcessStatus("");
      setUploadStatus("");
      setAudioUrl("");
      setAudioBlob(null);
      setRecordingStatus("");

      setSelectedMeeting({
        ...fullMeeting,
        audio_url: playableAudioUrl,
      });
    }
  }

  function getToken() {
    const token = localStorage.getItem("access_token");
    if (!token) {
      throw new Error("You must log in first");
    }
    return token;
  }

  function normalizeAudioUrl(url?: string | null) {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${API_BASE_URL}/${url.replace(/^\/+/, "")}`;
  }

  if (!isLoggedIn) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f6f8",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "16px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
            textAlign: "center",
            width: "320px",
          }}
        >
          <h1 style={{ margin: "0 0 10px 0", color: "#111827" }}>Wanore</h1>
          <p style={{ margin: "0 0 20px 0", color: "#4b5563" }}>Snapshots</p>

          <div
            id="googleSignInDiv"
            style={{ display: "flex", justifyContent: "center" }}
          ></div>

          <p style={{ marginTop: "10px", color: "red" }}>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#f5f6f8",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          flex: 1,
        }}
      >
        <div
          style={{
            width: "380px",
            flexShrink: 0,
            background: "#0f2233",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflowY: "hidden",
          }}
        >
          <RecordingPanel
            title={title}
            setTitle={setTitle}
            handleCreateMeeting={handleCreateMeeting}
            loadingMeeting={loadingMeeting}
            meetingError={meetingError}
            createdMeeting={activeMeeting}
            isRecording={isRecording}
            startRecording={startRecording}
            stopRecording={stopRecording}
            recordingStatus={recordingStatus}
            audioUrl={audioUrl}
            audioBlob={audioBlob}
            uploadAudio={uploadAudio}
            isUploading={isUploading}
            uploadStatus={uploadStatus}
            generateSummary={generateSummary}
            processingSummary={processingSummary}
            processStatus={processStatus}
            generatedSummary={generatedSummary}
            generatedTranscript={generatedTranscript}
          />

          <MeetingList
            meetings={meetings}
            onSelect={loadMeeting}
            selectedMeetingId={selectedMeeting?.id || null}
          />
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "24px",
          }}
        >
          {/* TOP RIGHT LOGOUT */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            {/* EMAIL */}
            <span
              style={{
                fontSize: "13px",
                color: "#64748b",
                fontWeight: 500,
                maxWidth: "220px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={userEmail}
            >
              {userEmail}
            </span>

            {/* LOGOUT BUTTON */}
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 14px",
                borderRadius: "999px",
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                color: "#334155",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f8fafc";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ffffff";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}
            >
              Log out
            </button>
          </div>

          {/* MEETING VIEW */}
          <div style={{ flex: 1 }}>
            <MeetingView
              meeting={selectedMeeting}
              normalizeAudioUrl={normalizeAudioUrl}
              shareEmail={shareEmail}
              setShareEmail={setShareEmail}
              shareMeeting={shareMeeting}
              shareStatus={shareStatus}
              isSharing={isSharing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
