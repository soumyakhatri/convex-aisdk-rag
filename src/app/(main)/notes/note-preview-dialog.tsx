"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { Doc } from "../../../../convex/_generated/dataModel";
import { useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";

interface NotePreviewDialog {
  note: Doc<"notes">
}

export function NotePreviewDialog({ note }: NotePreviewDialog) {
  const deleteNote = useMutation(api.notes.deleteNote)
  const searchParams = useSearchParams()
  const noteId = searchParams.get("noteId")
  const isOpen = noteId === note._id
  const [isPending, setIsPending] = useState(false)

  const handleClose = () => {
    window.history.pushState(null, "", window.location.pathname)
  }

  const handleDelete = async () => {
    setIsPending(true)
    try {
      await deleteNote({
        noteId: note._id
      })
      handleClose()
      toast.success("Note deleted successfully")
    } catch (error) {
      console.log(error, "Error deleting note")
      toast.error("Error deleting note. Please try again.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{note.title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 whitespace-pre-wrap">{note.body}</div>
        <DialogFooter className="mt-6">
          <Button variant="destructive" className="gap-2" onClick={handleDelete} disabled={isPending}>
            <Trash2 size={16} />
            {isPending ? "Deleting Note..." : "Delete Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
