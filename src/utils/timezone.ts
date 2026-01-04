const GMT_OFFSET_MS = 7 * 60 * 60 * 1000

export const formatToGMT7ISO = (date: Date): string => {
  const d = new Date(date.getTime() + GMT_OFFSET_MS)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}+07:00`
}

export const formatDateToYYYYMMDDGMT7 = (date: Date | string): string => {
  const d = date instanceof Date ? new Date(date.getTime() + GMT_OFFSET_MS) : new Date(new Date(String(date)).getTime() + GMT_OFFSET_MS)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const getUtcRangeForLocalDay = (localDate?: Date) => {
  const now = localDate ? new Date(localDate) : new Date()
  const localNow = new Date(now.getTime() + GMT_OFFSET_MS)
  const localStartOfDay = new Date(localNow.getFullYear(), localNow.getMonth(), localNow.getDate(), 0, 0, 0, 0)
  const startUtc = new Date(localStartOfDay.getTime() - GMT_OFFSET_MS)
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000)
  return { startUtc, endUtc }
}

export const getUtcRangeForLocalMonth = (year: number, month: number) => {
  const startMonthLocal = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const startMonthUtc = new Date(startMonthLocal.getTime() - GMT_OFFSET_MS)
  const endMonthLocal = new Date(year, month, 1, 0, 0, 0, 0)
  const endMonthUtc = new Date(endMonthLocal.getTime() - GMT_OFFSET_MS)
  return { startMonthUtc, endMonthUtc }
}


