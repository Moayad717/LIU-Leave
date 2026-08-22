import { CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react"
import { getStatusLabel } from "@/types/enums"
import { cn } from "@/lib/utils"

interface Props {
  status: string
  className?: string
}

const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"

export function StatusBadge({ status, className }: Props) {
  const label = getStatusLabel(status)

  switch (status) {
    case "APPROVED":
      return (
        <span className={cn(base, "bg-green-100 text-green-800", className)}>
          <CheckCircle2 className="w-3 h-3" /> {label}
        </span>
      )
    case "REJECTED":
    case "STEP1_REJECTED":
    case "STEP2_REJECTED":
      return (
        <span className={cn(base, "bg-red-100 text-red-700", className)}>
          <XCircle className="w-3 h-3" /> {label}
        </span>
      )
    case "STEP1_APPROVED":
      return (
        <span className={cn(base, "bg-blue-100 text-blue-800", className)}>
          <ChevronRight className="w-3 h-3" /> {label}
        </span>
      )
    case "STEP2_APPROVED":
      return (
        <span className={cn(base, "bg-purple-100 text-purple-800", className)}>
          <ChevronRight className="w-3 h-3" /> {label}
        </span>
      )
    default:
      // PENDING
      return (
        <span className={cn(base, "bg-amber-100 text-amber-800", className)}>
          <Clock className="w-3 h-3" /> {label}
        </span>
      )
  }
}
