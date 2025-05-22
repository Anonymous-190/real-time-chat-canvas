
import { useState, useEffect } from "react";
import { useChats } from "@/context/chats"; // Updated import path
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Filter, Search, UserRound, MessageSquare, MoreVertical, Plus, Clock, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

export function ChatsSidebar() {
  const { filteredChats, setCurrentChat, currentChat, filterChats } = useChats();
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    filterChats(searchQuery);
  }, [searchQuery, filterChats]);

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Format relative time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      // Today, show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // Different day, show date
      return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
    }
  };

  // Format last message preview
  const getMessagePreview = (content: string) => {
    return content.length > 30 ? `${content.substring(0, 30)}...` : content;
  };

  return (
    <div className="w-[360px] border-r border-chat-border flex flex-col h-full bg-white">
      <div className="p-3 flex items-center justify-between border-b border-chat-border">
        <Avatar className="h-9 w-9">
          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.email || "User"}`} />
          <AvatarFallback>
            {user?.email ? getInitials(user.email.split('@')[0]) : "U"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <UserRound className="h-5 w-5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MessageSquare className="h-5 w-5 text-gray-500" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </div>
      
      <div className="p-2 border-b border-chat-border">
        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="sm" className="flex items-center gap-1 text-xs">
            <Filter className="h-3 w-3" /> Custom filter
          </Button>
          <Button variant="outline" size="sm" className="text-xs">Save</Button>
          
          <div className="flex-grow flex items-center gap-2">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search" 
                className="pl-8 h-8 text-sm" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Button variant="ghost" size="sm" className="text-whatsapp-teal text-xs">
            Filtered
          </Button>
        </div>
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {filteredChats.map((chat) => {
          const isActive = currentChat?.id === chat.id;
          
          return (
            <div
              key={chat.id}
              className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 ${
                isActive ? "bg-gray-100" : ""
              }`}
              onClick={() => setCurrentChat(chat)}
            >
              <Avatar className="h-11 w-11 mr-3">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${chat.name}`} />
                <AvatarFallback>{chat.name ? getInitials(chat.name) : "CH"}</AvatarFallback>
              </Avatar>
              
              <div className="flex-grow overflow-hidden">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-sm truncate">{chat.name}</h3>
                  <span className="text-xs text-gray-500">
                    {formatTime(chat.updated_at)}
                  </span>
                </div>
                
                <div className="flex items-center">
                  {chat.last_message ? (
                    <p className="text-xs text-gray-500 truncate">{getMessagePreview(chat.last_message.content)}</p>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No messages yet</p>
                  )}
                </div>
              </div>
              
              {chat.type && (
                <div className="ml-2">
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] py-0.5 px-2 ${
                      chat.type === 'demo' ? 'border-orange-300 text-orange-700' :
                      chat.type === 'internal' ? 'border-green-300 text-green-700' :
                      chat.type === 'signup' ? 'border-blue-300 text-blue-700' :
                      'border-purple-300 text-purple-700'
                    }`}
                  >
                    {chat.type}
                  </Badge>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="p-4 absolute bottom-4 right-4">
        <Button 
          size="icon" 
          className="h-14 w-14 rounded-full bg-whatsapp-green hover:bg-whatsapp-dark shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
