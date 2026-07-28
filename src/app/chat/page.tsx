import { ChatBox } from "@/components/ChatBox";
import { HistoryPanel } from "@/components/HistoryPanel";

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100vh-64px)]">
      <div className="w-72 border-r hidden lg:block bg-background">
        <HistoryPanel />
      </div>
      <div className="flex-1">
        <ChatBox />
      </div>
    </div>
  );
}