"use client";

import { useState, useTransition, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { sendMessage } from "@/lib/actions";
import { X, Send, Search } from "lucide-react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  surname: string;
  username: string;
  type: "STUDENT" | "TEACHER" | "PARENT";
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserType: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";
};

export function ComposeMessageModal({ isOpen, onClose, currentUserId, currentUserType }: Props) {
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [showUserList, setShowUserList] = useState(false);
  const router = useRouter();

  //* Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch("/api/users/search")
        .then((res) => res.json())
        .then((data) => setUsers(data))
        .catch((err) => console.error("Failed to fetch users:", err));
    }
  }, [isOpen]);

  const filteredUsers = users.filter(
    (user) =>
      user.id !== currentUserId &&
      (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser) {
      alert("Please select a recipient");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("senderId", currentUserId);
      formData.append("senderType", currentUserType);
      formData.append("receiverId", selectedUser.id);
      formData.append("receiverType", selectedUser.type);
      formData.append("subject", subject);
      formData.append("content", content);

      const result = await sendMessage(formData);
      if (result.success) {
        setSelectedUser(null);
        setSubject("");
        setContent("");
        setSearchQuery("");
        onClose();
        router.refresh();
      } else {
        alert(result.message || "Failed to send message");
      }
    });
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(`${user.name} ${user.surname} (@${user.username})`);
    setShowUserList(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-white flex items-center">
            <Send className="w-5 h-5 sm:w-6 sm:h-6 mr-2 text-blue-600" />
            Compose New Message
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* ! Recipient Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              To: <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowUserList(true);
                  setSelectedUser(null);
                }}
                onFocus={() => setShowUserList(true)}
                placeholder="Search for students, teachers, or parents..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setSearchQuery("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* ! User Dropdown */}
              {showUserList && searchQuery && !selectedUser && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold mr-3 flex-shrink-0">
                          {user.name.charAt(0)}{user.surname.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900">
                            {user.name} {user.surname}
                          </p>
                          <p className="text-sm text-gray-500">@{user.username} • {user.type}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-center text-gray-500">
                      No users found
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {selectedUser && (
              <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center font-bold mr-3 flex-shrink-0">
                  {selectedUser.name.charAt(0)}{selectedUser.surname.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {selectedUser.name} {selectedUser.surname}
                  </p>
                  <p className="text-sm text-gray-600">@{selectedUser.username} • {selectedUser.type}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setSearchQuery("");
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* ! Subject */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Subject: <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* ! Message Content */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Message: <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Type your message here..."
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          {/* ! Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !selectedUser}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 w-full sm:w-auto"
            >
              {isPending ? (
                <>Sending...</>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

