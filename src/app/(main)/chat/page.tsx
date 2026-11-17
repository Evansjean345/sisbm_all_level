import { Chat } from "@/features/chat/chat";
import { conversations } from "@/features/chat/data";

export default function Page() {
  return <Chat conversations={conversations} />;
}
