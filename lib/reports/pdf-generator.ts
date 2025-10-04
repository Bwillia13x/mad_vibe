import { Buffer } from 'node:buffer'
import type { StoredTaskResult, StoredStepResult } from '../agents/result-persistence'

/**
 * Generate a PDF report for a single agent task result
 * Returns a Buffer suitable for sending as application/pdf
 */
export async function generateTaskPDF(
  task: StoredTaskResult,
  steps: StoredStepResult[]
): Promise<Buffer> {
  // Lazy-load pdfkit to avoid bundling issues
  const mod = await import('pdfkit')
  // Support both CJS default export and named export in various bundlers
  const PDFDocument = (mod as unknown as { default?: any }).default ?? (mod as unknown as any)

  const doc = new PDFDocument({ size: 'LETTER', margin: 50 })
  const chunks: Buffer[] = []

  return await new Promise<Buffer>((resolve, reject) => {
    try {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', (err: unknown) => reject(err))

      // Title
      doc.fontSize(18).text('Agent Analysis Report', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(12).text(`Task ID: ${task.taskId}`, { align: 'center' })
      if (task.taskDescription) {
        doc.moveDown(0.25)
        doc.fontSize(11).text(task.taskDescription, { align: 'center' })
      }

      doc.moveDown(1)
      doc.fontSize(10)
      const completedAt = task.completedAt ? new Date(task.completedAt).toLocaleString() : 'N/A'
      const duration = task.durationMs != null ? `${Math.round(task.durationMs / 1000)}s` : 'N/A'

      doc.text(`Type: ${task.taskType}`)
      doc.text(`Status: ${task.status}`)
      doc.text(`Completed: ${completedAt}`)
      doc.text(`Duration: ${duration}`)

      // Summary Section
      doc.moveDown(1)
      doc.fontSize(14).text('Summary', { underline: true })
      doc.moveDown(0.5)
      if (task.resultSummary && Object.keys(task.resultSummary).length > 0) {
        doc.fontSize(9).text(JSON.stringify(task.resultSummary, null, 2))
      } else {
        doc.fontSize(10).text('No summary available')
      }

      // Steps Section
      doc.addPage()
      doc.fontSize(14).text('Execution Steps', { underline: true })
      doc.moveDown(0.5)
      if (steps.length === 0) {
        doc.fontSize(10).text('No steps recorded')
      } else {
        steps.forEach((s, i) => {
          doc.fontSize(12).text(`${i + 1}. ${s.stepName || s.action}`)
          doc
            .fontSize(10)
            .text(`Action: ${s.action}`)
            .text(`Status: ${s.status}`)
            .text(
              `Duration: ${s.durationMs != null ? Math.round(s.durationMs / 1000) + 's' : 'N/A'}`
            )
          if (s.error) {
            doc.fillColor('red').text(`Error: ${s.error}`)
            doc.fillColor('black')
          }
          if (s.result) {
            try {
              const preview = JSON.stringify(s.result, null, 2)
              doc.fontSize(9).text(preview.length > 1500 ? preview.slice(0, 1500) + '…' : preview)
            } catch {
              doc.fontSize(9).text(String(s.result))
            }
          }
          doc.moveDown(0.75)
        })
      }

      doc.end()
    } catch (err) {
      reject(err)
    }
  })
}
