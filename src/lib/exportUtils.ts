import { CellData } from "@/types/spreadsheet"

export function exportToCSV(
  cells: Record<string, CellData>,
  title: string,
  rows: number = 30,
  cols: number = 20
): void {
  const data: string[][] = []

  // Create header row with column letters
  const header: string[] = [""]
  for (let c = 0; c < cols; c++) {
    header.push(String.fromCharCode(65 + c))
  }
  data.push(header)

  // Add cell data
  for (let r = 1; r <= rows; r++) {
    const row: string[] = [r.toString()]
    for (let c = 0; c < cols; c++) {
      const cellId = `${String.fromCharCode(65 + c)}${r}`
      const cellValue = cells[cellId]?.value || ""
      // Escape quotes in CSV values
      const escapedValue = `"${cellValue.replace(/"/g, '""')}"`
      row.push(escapedValue)
    }
    data.push(row)
  }

  // Convert to CSV string
  const csv = data.map(row => row.join(",")).join("\n")

  // Create blob and download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `${title || "spreadsheet"}.csv`)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToJSON(
  cells: Record<string, CellData>,
  title: string,
  metadata?: { author?: string; createdAt?: string }
): void {
  const data = {
    title,
    metadata,
    cells,
    exportedAt: new Date().toISOString()
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: "application/json;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `${title || "spreadsheet"}.json`)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function exportToHTML(
  cells: Record<string, CellData>,
  title: string,
  rows: number = 30,
  cols: number = 20
): void {
  let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <table>
    <thead>
      <tr>
        <th></th>`

  // Add header row
  for (let c = 0; c < cols; c++) {
    html += `<th>${String.fromCharCode(65 + c)}</th>`
  }
  html += `</tr></thead><tbody>`

  // Add cell data
  for (let r = 1; r <= rows; r++) {
    html += `<tr><td><strong>${r}</strong></td>`
    for (let c = 0; c < cols; c++) {
      const cellId = `${String.fromCharCode(65 + c)}${r}`
      const cellValue = cells[cellId]?.value || ""
      const format = cells[cellId]?.format
      
      let cellStyle = ""
      if (format?.bold) cellStyle += "font-weight: bold;"
      if (format?.italic) cellStyle += "font-style: italic;"
      if (format?.backgroundColor) cellStyle += `background-color: ${format.backgroundColor};`
      if (format?.textColor) cellStyle += `color: ${format.textColor};`
      if (format?.textAlign) cellStyle += `text-align: ${format.textAlign};`

      html += `<td${cellStyle ? ` style="${cellStyle}"` : ""}>${escapeHTML(cellValue)}</td>`
    }
    html += `</tr>`
  }

  html += `</tbody></table></body></html>`

  const blob = new Blob([html], { type: "text/html;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `${title || "spreadsheet"}.html`)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function escapeHTML(text: string): string {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}
