import type { Metadata } from "next";
import { LifeOSChatWorkspace } from "@/components/chat/lifeos-chat-workspace";

export const metadata: Metadata = {
  title: "LifeOS Chat",
  description: "Chat dengan AI LifeOS — konteks per fitur, streaming, markdown, session.",
};

export default function ChatPage() {
  return <LifeOSChatWorkspace />;
}
