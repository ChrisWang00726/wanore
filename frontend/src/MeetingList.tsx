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
};

export default function MeetingList({ meetings, onSelect }: Props) {
  return (
    <div>
      <h2>Your Meetings</h2>

      <h3>Owned</h3>
      {meetings.owned.map((m) => (
        <div
          key={m.id}
          style={{ cursor: "pointer", marginBottom: "0.5rem" }}
          onClick={() => onSelect(m.id)}
        >
          {m.title}
        </div>
      ))}

      <h3>Shared</h3>
      {meetings.shared.map((m) => (
        <div
          key={m.id}
          style={{ cursor: "pointer", marginBottom: "0.5rem" }}
          onClick={() => onSelect(m.id)}
        >
          {m.title}
        </div>
      ))}
    </div>
  );
}
