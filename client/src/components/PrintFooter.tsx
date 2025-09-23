export default function PrintFooter() {
  return (
    <div className="print-only mt-8 text-xs text-gray-600">
      <hr className="my-3 border-gray-300" />
      <div>Andreas Vibe — Business Management Platform</div>
      <div>Generated: {new Date().toLocaleString()}</div>
      <div>https://www.andreasformen.ca</div>
    </div>
  )
}
