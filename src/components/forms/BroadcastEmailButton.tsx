"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { SendEmailModal } from "@/components/modals/SendEmailModal";

export function BroadcastEmailButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button 
        variant="outline" 
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
      >
        <Mail className="w-4 h-4" />
        Broadcast Email
      </Button>

      <SendEmailModal
        open={open}
        onOpenChange={setOpen}
        recipientEmail="all-parents"
        recipientName="All Parents"
        broadcast={true}
      />
    </>
  );
}
