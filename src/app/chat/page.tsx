import { ChatBox } from "@/components/ChatBox";
import { HistoryPanel } from "@/components/HistoryPanel";

export default function ChatPage() {
  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0">
        <ChatBox />
      </div>
      <div
        className="hidden xl:block w-[16rem] shrink-0 h-screen sticky top-0"
        style={{ borderLeft: "1px solid var(--border)" }}
      >
        <HistoryPanel />
      </div>
    </div>
  );
}
