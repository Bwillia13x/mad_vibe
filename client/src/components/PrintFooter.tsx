export default function PrintFooter() {
  return (
    <div className="print-only mt-8 text-xs text-gray-600">
      <hr className="my-3 border-gray-300" />
      <div>MAD Vibe — Financial Analysis Platform</div>
      <div>Generated: {new Date().toLocaleString()}</div>
    </div>
  )
}
