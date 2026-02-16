import { getAllOfflineFiles } from "./offline.db"
import { type StorageEstimate } from "./offline.types"

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export async function estimateStorage(): Promise<StorageEstimate> {
  try {
    const offlineFiles = await getAllOfflineFiles()

    const usageByFile: Record<string, number> = {}
    let offlineUsage = 0

    for (const file of offlineFiles) {
      usageByFile[file.fileId] = file.size
      offlineUsage += file.size
    }

    let usage = offlineUsage
    let quota = 0

    if (
      typeof navigator !== "undefined" &&
      navigator.storage &&
      typeof navigator.storage.estimate === "function"
    ) {
      const estimate = await navigator.storage.estimate()
      usage = typeof estimate.usage === "number" ? estimate.usage : offlineUsage
      quota = typeof estimate.quota === "number" ? estimate.quota : 0
    }

    return {
      usage,
      quota,
      usageByFile,
    }
  } catch (error) {
    throw new Error(`Offline error: ${getErrorMessage(error)}`)
  }
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB", "TB"] as const
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )

  const value = bytes / 1024 ** exponent
  const precision = exponent === 0 ? 0 : value < 10 ? 1 : 0

  return `${value.toFixed(precision)} ${units[exponent]}`
}
