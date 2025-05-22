
import { useChats } from "@/context/ChatsContext";
import { Search, MoreVertical, Phone, RefreshCw, HelpCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function ChatHeader() {
  const { currentChat } = useChats();

  if (!currentChat) {
    return (
      <div className="h-16 border-b border-chat-border flex items-center justify-between px-4 bg-white">
        <h2 className="font-semibold">Select a chat to start messaging</h2>
      </div>
    );
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="h-16 border-b border-chat-border flex items-center justify-between px-4 bg-white">
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${currentChat.name}`} />
          <AvatarFallback>{currentChat.name ? getInitials(currentChat.name) : "CH"}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{currentChat.name}</h3>
          <p className="text-xs text-gray-500">
            {currentChat.is_group ? "Group chat" : "Online"}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="text-gray-600">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-600">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-600">
          <RefreshCw className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-600">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-600">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
