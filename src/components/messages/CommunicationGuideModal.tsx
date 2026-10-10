"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Inbox, Star, Archive, ShieldCheck, Users } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function CommunicationGuideModal({ isOpen, onClose }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center text-purple-600">
            <MessageSquare className="w-6 h-6 mr-2" />
            Communication Guide
          </DialogTitle>
          <DialogDescription>
            Learn how to use the student management messaging system effectively.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center">
              <Send className="w-5 h-5 mr-2 text-blue-500" />
              Sending Messages
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              To start a new conversation, click the <span className="font-semibold text-blue-600">"New Message"</span> button at the top. You can search for recipients by their name, surname, or username. We support communication between teachers, students, and parents.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center">
              <Inbox className="w-5 h-5 mr-2 text-green-500" />
              Managing Your Inbox
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm mb-1 flex items-center">
                  <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" /> Starred
                </p>
                <p className="text-xs text-gray-500">Mark important messages to find them quickly later.</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium text-sm mb-1 flex items-center">
                  <Archive className="w-4 h-4 mr-1 text-gray-500" /> Archive
                </p>
                <p className="text-xs text-gray-500">Move old conversations out of your inbox without deleting them.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-purple-500" />
              Professionalism & Privacy
            </h3>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
              <li>Always maintain a professional and respectful tone.</li>
              <li>Avoid sharing sensitive personal information via messaging.</li>
              <li>Messages are primarily for school-related updates and inquiries.</li>
            </ul>
          </section>

          <section className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <h3 className="text-md font-semibold flex items-center text-purple-700">
              <Users className="w-5 h-5 mr-2" />
              Who can I message?
            </h3>
            <p className="text-sm text-purple-600">
              Depending on your role, you can reach out to your teachers, classmates, or parents. Admins can communicate with all users in the system.
            </p>
          </section>

          <div className="pt-4 border-t flex justify-end">
            <Button onClick={onClose} className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
              Got it, thanks!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
