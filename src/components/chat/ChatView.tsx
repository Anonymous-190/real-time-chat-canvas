
import { ChatHeader } from "./ChatHeader";
import { MessagesList } from "./MessagesList";
import { MessageInput } from "./MessageInput";
import { useChats } from "@/context/chats";

export function ChatView() {
  const { currentChat } = useChats();
  
  return (
    <div className="flex flex-col flex-grow h-full">
      <ChatHeader />
      <MessagesList />
      <MessageInput />
    </div>
  );
}
