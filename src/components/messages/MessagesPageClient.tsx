"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Send, Inbox, Archive, Star, Reply, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ComposeMessageModal } from "@/components/forms/ComposeMessageModal";
import { MessageDetailModal } from "@/components/messages/MessageDetailModal";
import { CommunicationGuideModal } from "@/components/messages/CommunicationGuideModal";
import { useRouter } from "next/navigation";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";

type Message = {
  id: number;
  subject: string;
  content: string;
  senderId: string;
  senderType: string;
  receiverId: string;
  receiverType: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  createdAt: Date;
  sender: {
    name: string;
    surname: string;
    username: string;
  };
  receiver: {
    name: string;
    surname: string;
    username: string;
  };
};

type Props = {
  messages: Message[];
  userId: string;
  userType: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
  activeTab: string;
};

export function MessagesPageClient({ messages, userId, userType, activeTab }: Props) {
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [messageSearch, setMessageSearch] = useState("");
  const router = useRouter();

  const inboxMessages = messages.filter((m) => m.receiverId === userId && !m.archived);
  const sentMessages = messages.filter((m) => m.senderId === userId && !m.archived);
  const starredMessages = messages.filter((m) => m.starred && !m.archived);
  const archivedMessages = messages.filter((m) => m.archived);
  const unreadCount = inboxMessages.filter((m) => !m.read).length;

  const getActiveMessages = () => {
    switch (activeTab) {
      case "sent":
        return sentMessages;
      case "starred":
        return starredMessages;
      case "archived":
        return archivedMessages;
      default:
        return inboxMessages;
    }
  };

  const activeMessages = getActiveMessages();
  const normalizedMessageSearch = messageSearch.trim().toLowerCase();
  const visibleMessages = normalizedMessageSearch
    ? activeMessages.filter((message) => {
        const isInbox = message.receiverId === userId;
        const otherUser = isInbox ? message.sender : message.receiver;
        return [
          message.subject,
          message.content,
          otherUser.name,
          otherUser.surname,
          otherUser.username,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedMessageSearch);
      })
    : activeMessages;

  const changeTab = (tab: string) => {
    router.push(`/dashboard/messages?tab=${tab}`);
  };

  return (
    <div className="space-y-6">
      {/* ! Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 text-center sm:text-left">Messages & Communication</h1>
            <p className="text-blue-100 text-base sm:text-lg text-center sm:text-left">
              Connect with teachers, students, and parents
            </p>
          </div>
          <Button
            onClick={() => setIsComposeOpen(true)}
            className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-4 sm:py-6 text-base sm:text-lg w-full sm:w-auto"
          >
            <Send className="w-5 h-5 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      {/* ! Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <button
          type="button"
          className="block w-full text-left"
          onClick={() => changeTab("inbox")}
        >
          <DashboardMetricCard
            title="Inbox"
            value={inboxMessages.length.toString()}
            description="Messages received from teachers, students, and parents."
            icon={Inbox}
            tone="sky"
            badge="Mailbox"
            detail={`${unreadCount} unread`}
            active={activeTab === "inbox"}
            interactive
          />
        </button>

        <button
          type="button"
          className="block w-full text-left"
          onClick={() => changeTab("sent")}
        >
          <DashboardMetricCard
            title="Sent"
            value={sentMessages.length.toString()}
            description="Conversations you have already initiated and delivered."
            icon={Send}
            tone="emerald"
            badge="Outgoing"
            detail="Delivered"
            active={activeTab === "sent"}
            interactive
          />
        </button>

        <button
          type="button"
          className="block w-full text-left"
          onClick={() => changeTab("starred")}
        >
          <DashboardMetricCard
            title="Starred"
            value={starredMessages.length.toString()}
            description="Important threads you flagged for quick follow-up."
            icon={Star}
            tone="violet"
            badge="Priority"
            detail="Saved items"
            active={activeTab === "starred"}
            interactive
          />
        </button>

        <button
          type="button"
          className="block w-full text-left"
          onClick={() => changeTab("archived")}
        >
          <DashboardMetricCard
            title="Archived"
            value={archivedMessages.length.toString()}
            description="Older conversations moved out of the active inbox."
            icon={Archive}
            tone="slate"
            badge="History"
            detail="Stored threads"
            active={activeTab === "archived"}
            interactive
          />
        </button>
      </div>

      {/* ! Message Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none sm:scrollbar-auto no-scrollbar sm:flex-wrap">
        <Button
          variant={activeTab === "inbox" ? "default" : "outline"}
          onClick={() => changeTab("inbox")}
          className={`${activeTab === "inbox" ? "bg-blue-600" : ""} flex-shrink-0`}
        >
          <Inbox className="w-4 h-4 mr-2" />
          Inbox ({inboxMessages.length})
        </Button>
        <Button
          variant={activeTab === "sent" ? "default" : "outline"}
          onClick={() => changeTab("sent")}
          className={`${activeTab === "sent" ? "bg-green-600" : ""} flex-shrink-0 `}
        >
          <Send className="w-4 h-4 mr-2" />
          Sent ({sentMessages.length})
        </Button>
        <Button
          variant={activeTab === "starred" ? "default" : "outline"}
          onClick={() => changeTab("starred")}
          className={`${activeTab === "starred" ? "bg-purple-600" : ""} flex-shrink-0`}
        >
          <Star className="w-4 h-4 mr-2" />
          Starred ({starredMessages.length})
        </Button>
        <Button
          variant={activeTab === "archived" ? "default" : "outline"}
          onClick={() => changeTab("archived")}
          className={`${activeTab === "archived" ? "bg-gray-600" : ""} flex-shrink-0`}
        >
          <Archive className="w-4 h-4 mr-2" />
          Archived ({archivedMessages.length})
        </Button>
      </div>

      {/* ! Messages List */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardTitle className="flex items-center text-lg text-black capitalize">
            {activeTab === "inbox" && <Inbox className="w-6 h-6 mr-3 text-blue-600" />}
            {activeTab === "sent" && <Send className="w-6 h-6 mr-3 text-green-600" />}
            {activeTab === "starred" && <Star className="w-6 h-6 mr-3 text-purple-600" />}
            {activeTab === "archived" && <Archive className="w-6 h-6 mr-3 text-gray-600" />}
            {activeTab}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={messageSearch}
              onChange={(event) => setMessageSearch(event.target.value)}
              placeholder="Search messages by person, subject, or content"
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pl-10 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {visibleMessages.length > 0 ? (
            <div className="space-y-2">
              {visibleMessages.map((message) => {
                const isInbox = message.receiverId === userId;
                const otherUser = isInbox ? message.sender : message.receiver;
                
                return (
                  <div
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    className={`p-4 rounded-lg border transition-all  duration-200 hover:shadow-md cursor-pointer ${
                      !message.read && isInbox
                        ? "bg-blue-50 border-blue-300  font-semibold"
                        : "bg-gray-800 border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold mr-3 sm:mr-4 flex-shrink-0">
                          {otherUser.name.charAt(0)}{otherUser.surname.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-1">
                            <p className={`${!message.read && isInbox ? "font-bold" : "font-medium"} text-sm sm:text-base text-gray-100 truncate`}>
                              {isInbox ? "" : "To: "}
                              {otherUser.name} {otherUser.surname}
                            </p>
                            <span className="text-[10px] sm:text-xs text-gray-500 flex-shrink-0">
                              {format(new Date(message.createdAt), "MMM dd, h:mm a")}
                            </span>
                          </div>
                          <p className={`text-xs sm:text-sm ${!message.read && isInbox ? "font-semibold" : "font-normal"} text-gray-100 mb-1 truncate`}>
                            {message.subject}
                          </p>
                          <p className="text-xs sm:text-sm text-gray-200 line-clamp-1 sm:line-clamp-2">
                            {message.content}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {message.starred && (
                              <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-400 text-yellow-400" />
                            )}
                            {!message.read && isInbox && (
                              <span className="text-[10px] bg-blue-100 text-blue-300 px-2 py-0.5 rounded-full">
                                New
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!message.read && isInbox && (
                        <div className="ml-2 sm:ml-4 flex-shrink-0">
                          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              {activeTab === "inbox" && <Inbox className="w-16 h-16 text-gray-300 mx-auto mb-4" />}
              {activeTab === "sent" && <Send className="w-16 h-16 text-gray-300 mx-auto mb-4" />}
              {activeTab === "starred" && <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />}
              {activeTab === "archived" && <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />}
              <p className="text-gray-500 text-lg">
                {normalizedMessageSearch ? "No messages match your search" : `No messages in ${activeTab}`}
              </p>

              <p className="text-gray-600 text-sm mt-2">
                {normalizedMessageSearch && "Try another name, subject, or message keyword"}
                {!normalizedMessageSearch && activeTab === "inbox" && "No messages received yet"}
                {!normalizedMessageSearch && activeTab === "sent" && "Start a conversation by sending a message"}
                {!normalizedMessageSearch && activeTab === "starred" && "Star important messages to find them here"}
                {!normalizedMessageSearch && activeTab === "archived" && "Archived messages will appear here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ! Communication Help Card */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Need Help?
              </h3>
              <p className="text-sm text-gray-600">
                Seamlessly communicate with teachers, students, and parents within the system
              </p>
            </div>
            <Button 
              onClick={() => setIsGuideOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Communication Guide
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ! Communication Guide Modal */}
      <CommunicationGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* ! Compose Message Modal */}
      <ComposeMessageModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        currentUserId={userId}
        currentUserType={userType}
      />

      {/* ! Message Detail Modal */}
      {selectedMessage && (
        <MessageDetailModal
          message={selectedMessage}
          isOpen={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          currentUserId={userId}
          currentUserType={userType}
        />
      )}
    </div>
  );
}

