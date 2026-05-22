"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle2, XCircle } from "lucide-react"
import { reviewLeaveRequest } from "@/actions/admin"
import { toast } from "sonner"

interface Props {
  requestId: string
  dates: string[] // ISO strings, sorted ascending
}

export function ReviewForm({ requestId, dates }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<"APPROVED" | "REJECTED" | null>(null)
  const [showRejectPanel, setShowRejectPanel] = useState(false)
  const [flagged, setFlagged] = useState<Set<string>>(new Set(dates))
  const [note, setNote] = useState("")

  const toggleDate = (iso: string) =>
    setFlagged((prev) => {
      const next = new Set(prev)
      next.has(iso) ? next.delete(iso) : next.add(iso)
      return next
    })

  const buildRejectComment = () => {
    const flaggedDates = dates
      .filter((iso) => flagged.has(iso))
      .map((iso) => format(new Date(iso), "EEE, MMM d"))
    const dateLine =
      flaggedDates.length > 0
        ? `Cannot approve the following dates: ${flaggedDates.join(", ")}.`
        : ""
    return [dateLine, note.trim()].filter(Boolean).join("\n")
  }

  const handleApprove = (comment: string) => {
    setPendingAction("APPROVED")
    startTransition(async () => {
      const result = await reviewLeaveRequest(requestId, "APPROVED", comment)
      if (result?.error) { toast.error(result.error); setPendingAction(null); return }
      toast.success("Request approved.")
      router.refresh()
    })
  }

  const handleReject = () => {
    const comment = buildRejectComment()
    if (!comment) {
      toast.error("Select at least one conflicting date or add a note.")
      return
    }
    setPendingAction("REJECTED")
    startTransition(async () => {
      const result = await reviewLeaveRequest(requestId, "REJECTED", comment)
      if (result?.error) { toast.error(result.error); setPendingAction(null); return }
      toast.success("Request rejected.")
      router.refresh()
    })
  }

  if (!showRejectPanel) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="approve-comment">
            Comment <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="approve-comment"
            placeholder="Add a note for the professor..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            disabled={isPending}
          />
        </div>
        <div className="flex gap-3">
          <Button
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={() => handleApprove(note)}
            disabled={isPending}
          >
            <CheckCircle2 className="w-4 h-4" />
            {pendingAction === "APPROVED" ? "Approving..." : "Approve"}
          </Button>
          <Button
            variant="outline"
            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => { setNote(""); setShowRejectPanel(true) }}
            disabled={isPending}
          >
            <XCircle className="w-4 h-4" />
            Reject…
          </Button>
        </div>
      </div>
    )
  }

  const preview = buildRejectComment()

  return (
    <div className="space-y-4 rounded-lg border border-red-200 bg-red-50/60 p-4">
      {/* Date chip selector */}
      <div>
        <p className="text-sm font-medium text-red-900 mb-1">Flag conflicting dates</p>
        <p className="text-xs text-red-500 mb-3">
          Selected dates (red) will appear in the rejection message. Tap to toggle.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFlagged(new Set(dates))}
            className="text-xs text-red-500 underline underline-offset-2"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFlagged(new Set())}
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            None
          </button>
          {dates.map((iso) => {
            const on = flagged.has(iso)
            return (
              <button
                key={iso}
                type="button"
                onClick={() => toggleDate(iso)}
                className={`px-2 py-0.5 rounded-md text-xs font-medium border transition-all ${
                  on
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-muted-foreground border-gray-200 hover:border-gray-300"
                }`}
              >
                {format(new Date(iso), "EEE, MMM d")}
              </button>
            )
          })}
        </div>
      </div>

      {/* Extra note */}
      <div className="space-y-1.5">
        <Label htmlFor="reject-note" className="text-red-900 text-sm">
          Additional note{" "}
          <span className="font-normal text-red-400">
            {flagged.size === 0 ? "(required)" : "(optional)"}
          </span>
        </Label>
        <Textarea
          id="reject-note"
          placeholder="e.g. Exam period, required on-site presence…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          disabled={isPending}
        />
      </div>

      {/* Live preview */}
      {preview && (
        <div className="rounded-md border border-red-100 bg-white px-3 py-2.5 text-xs">
          <p className="text-muted-foreground font-medium mb-1">Professor will see:</p>
          <p className="text-foreground whitespace-pre-line">{preview}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="destructive"
          className="gap-1.5"
          onClick={handleReject}
          disabled={isPending || !preview}
        >
          <XCircle className="w-4 h-4" />
          {pendingAction === "REJECTED" ? "Rejecting…" : "Confirm Rejection"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => { setShowRejectPanel(false); setNote(""); setFlagged(new Set(dates)) }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
