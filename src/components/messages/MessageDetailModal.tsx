"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sendMessage, markMessageAsRead, toggleMessageStarred } from "@/lib/actions";
import { Reply, Star, Archive, Trash2, Send } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

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
  message: Message;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserType: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
};

export function MessageDetailModal({ 
  message, 
  isOpen, 
  onClose, 
  currentUserId, 
  currentUserType 
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const router = useRouter();
  const isInbox = message.receiverId === currentUserId;
  const otherUser = isInbox ? message.sender : message.receiver;
  const otherUserType = isInbox ? message.senderType : message.receiverType;

  //* Mark as read when opened (if it's an inbox message)
  useEffect(() => {
    if (isOpen && isInbox && !message.read) {
      startTransition(async () => {
        await markMessageAsRead(message.id);
        router.refresh();
      });
    }
  }, [isOpen, isInbox, message.read, message.id, router]);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append("senderId", currentUserId);
      formData.append("senderType", currentUserType);
      formData.append("receiverId", message.senderId);
      formData.append("receiverType", message.senderType);
      formData.append("subject", `Re: ${message.subject}`);
      formData.append("content", replyContent);

      const result = await sendMessage(formData);
      if (result.success) {
        setReplyContent("");
        setIsReplying(false);
        router.refresh();
      }
    });
  };

  const handleToggleStar = () => {
    startTransition(async () => {
      await toggleMessageStarred(message.id, !message.starred);
      router.refresh();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-200 line-clamp-2">
            {message.subject}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* ! Message Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b gap-4">
              <div className="flex items-start">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold mr-3 sm:mr-4 flex-shrink-0 text-base sm:text-lg">
                  {otherUser.name.charAt(0)}{otherUser.surname.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-base sm:text-lg font-semibold text-gray-300 truncate">
                    {isInbox ? "From: " : "To: "}
                    {otherUser.name} {otherUser.surname}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">@{otherUser.username}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                    {format(new Date(message.createdAt), "MMMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-end sm:self-start">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleStar}
                  disabled={isPending}
                >
                  <Star className={`w-4 h-4 ${message.starred ? "fill-yellow-400 text-yellow-400" : ""}`} />
                </Button>
              </div>
            </div>

          {/* ! Message Content */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <p className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>

          {/* ! Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t">
            {isInbox && (
              <Button
                onClick={() => setIsReplying(!isReplying)}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                <Reply className="w-4 h-4 mr-2" />
                Reply
              </Button>
            )}
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Close
            </Button>
          </div>

          {/* ! Reply Form */}
          {isReplying && (
            <form onSubmit={handleReply} className="space-y-4 pt-6 border-t">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Replying to: {otherUser.name} {otherUser.surname}
                </p>
                <p className="text-xs text-gray-600">
                  Subject: Re: {message.subject}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Your Reply: <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Type your reply here..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent("");
                  }}
                  disabled={isPending}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || !replyContent.trim()}
                  className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                >
                  {isPending ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

