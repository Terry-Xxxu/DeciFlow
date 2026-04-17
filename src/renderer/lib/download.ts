/**
 * Download utility functions for exporting data
 */

/**
 * Download data as CSV file
 */
export function downloadAsCSV(data: any[], filename: string = "export.csv") {
  if (data.length === 0) {
    console.warn("No data to export")
    return
  }

  // Get headers from first object
  const headers = Object.keys(data[0])

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Handle values that contain commas or quotes
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value ?? ""
        })
        .join(",")
    ),
  ].join("\n")

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  downloadBlob(blob, filename)
}

/**
 * Download data as JSON file
 */
export function downloadAsJSON(data: any, filename: string = "export.json") {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
  downloadBlob(blob, filename)
}

/**
 * Download chart as image (PNG)
 */
export async function downloadChartAsImage(
  chartElement: HTMLElement,
  filename: string = "chart.png"
): Promise<void> {
  try {
    // Use html2canvas if available, otherwise show a message
    if (typeof (window as any).html2canvas === "function") {
      const canvas = await (window as any).html2canvas(chartElement, {
        backgroundColor: null,
        scale: 2,
      })
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          downloadBlob(blob, filename)
        }
      })
    } else {
      console.warn("html2canvas not available for chart export")
      // Show a toast or notification to the user
    }
  } catch (error) {
    console.error("Failed to export chart:", error)
  }
}

/**
 * Download text content as file
 */
export function downloadAsText(content: string, filename: string = "export.txt") {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8;" })
  downloadBlob(blob, filename)
}

/**
 * Helper function to trigger download
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Copy data to clipboard
 */
export async function copyToClipboard(data: any): Promise<boolean> {
  try {
    const text = typeof data === "string" ? data : JSON.stringify(data, null, 2)
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.error("Failed to copy to clipboard:", error)
    return false
  }
}

/**
 * Show a simple toast notification
 */
export function showToast(message: string, type: "success" | "error" | "info" = "info") {
  // Check if a toast container exists, create one if not
  let container = document.getElementById("toast-container")
  if (!container) {
    container = document.createElement("div")
    container.id = "toast-container"
    container.className = "fixed bottom-4 right-4 z-50 flex flex-col gap-2"
    document.body.appendChild(container)
  }

  // Create toast element
  const toast = document.createElement("div")
  const bgColor = {
    success: "bg-emerald-500",
    error: "bg-red-500",
    info: "bg-primary",
  }[type]

  toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right duration-300`
  toast.innerHTML = `
    <span class="text-sm font-medium">${message}</span>
  `

  container.appendChild(toast)

  // Auto remove after 3 seconds
  setTimeout(() => {
    toast.classList.add("animate-out", "slide-out-to-right")
    setTimeout(() => {
      toast.remove()
      if (container && container.children.length === 0) {
        container.remove()
      }
    }, 300)
  }, 3000)
}
