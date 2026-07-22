"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors print:hidden"
    >
      Print / Save as PDF
    </button>
  )
}
