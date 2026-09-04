import { jsPDF } from 'jspdf'

const PAGE_MARGIN = 14
const TITLE_Y = 18
const HEADER_Y = 30
const ROW_HEIGHT = 8
const PAGE_BREAK_Y = 280

export function buildReportPdf(title, headers, rows) {
  const doc = new jsPDF()
  const columnWidth = (doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2) / headers.length

  function drawHeaderRow(y) {
    doc.setFont(undefined, 'bold')
    headers.forEach((header, index) => {
      doc.text(String(header), PAGE_MARGIN + index * columnWidth, y)
    })
    doc.setFont(undefined, 'normal')
  }

  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.text(title, PAGE_MARGIN, TITLE_Y)

  doc.setFontSize(10)
  drawHeaderRow(HEADER_Y)

  let y = HEADER_Y + ROW_HEIGHT
  for (const row of rows) {
    if (y > PAGE_BREAK_Y) {
      doc.addPage()
      y = TITLE_Y
      drawHeaderRow(y)
      y += ROW_HEIGHT
    }
    row.forEach((value, index) => {
      doc.text(String(value ?? ''), PAGE_MARGIN + index * columnWidth, y)
    })
    y += ROW_HEIGHT
  }

  return doc
}
