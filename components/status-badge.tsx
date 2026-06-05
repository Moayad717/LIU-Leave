import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react"
import { getStatusLabel } from "@/types/enums"

interface Props {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: Props) {
  const label = getStatusLabel(status)

  switch (status) {
    case "APPROVED":
      return (
        <Badge variant="success" className={`gap-1 ${className ?? ""}`}>
          <CheckCircle2 className="w-3 h-3" /> {label}
        </Badge>
      )
    case "REJECTED":
    case "STEP1_REJECTED":
    case "STEP2_REJECTED":
      return (
        <Badge variant="destructive" className={`gap-1 ${className ?? ""}`}>
          <XCircle className="w-3 h-3" /> {label}
        </Badge>
      )
    case "STEP1_APPROVED":
      return (
        <Badge className={`gap-1 bg-blue-600 hover:bg-blue-700 ${className ?? ""}`}>
          <ChevronRight className="w-3 h-3" /> {label}
        </Badge>
      )
    case "STEP2_APPROVED":
      return (
        <Badge className={`gap-1 bg-purple-600 hover:bg-purple-700 ${className ?? ""}`}>
          <ChevronRight className="w-3 h-3" /> {label}
        </Badge>
      )
    default:
      // PENDING
      return (
        <Badge variant="warning" className={`gap-1 ${className ?? ""}`}>
          <Clock className="w-3 h-3" /> {label}
        </Badge>
      )
  }
}
