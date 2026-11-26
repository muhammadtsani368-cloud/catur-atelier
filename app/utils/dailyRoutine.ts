export type DailyRoutineTaskId = 'daily-puzzle' | 'match-or-tactics' | 'repertoire-drill'

export interface DailyRoutineStatus {
  date: string
  completedIds: DailyRoutineTaskId[]
}

export interface DailyRoutineTaskView {
  id: DailyRoutineTaskId
  title: string
  subtitle: string
  minutes: number
  done: boolean
  to: string
  ctaLabel: string
}

const DAILY_ROUTINE_STORAGE_KEY = 'grandmaster_atelier_daily_routine_v1'

export function getTodayLocalIso(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function loadDailyRoutineStatus(todayIso: string = getTodayLocalIso()): DailyRoutineStatus {
  if (typeof window === 'undefined') {
    return { date: todayIso, completedIds: [] }
  }
  try {
    const raw = localStorage.getItem(DAILY_ROUTINE_STORAGE_KEY)
    if (!raw) return { date: todayIso, completedIds: [] }
    const parsed = JSON.parse(raw) as Partial<DailyRoutineStatus>
    if (parsed.date !== todayIso || !Array.isArray(parsed.completedIds)) {
      return { date: todayIso, completedIds: [] }
    }
    return {
      date: todayIso,
      completedIds: parsed.completedIds.filter(
        (id): id is DailyRoutineTaskId =>
          id === 'daily-puzzle' || id === 'match-or-tactics' || id === 'repertoire-drill'
      )
    }
  } catch {
    return { date: todayIso, completedIds: [] }
  }
}

export function markDailyRoutineTaskComplete(
  taskId: DailyRoutineTaskId,
  todayIso: string = getTodayLocalIso()
): DailyRoutineStatus {
  const current = loadDailyRoutineStatus(todayIso)
  if (!current.completedIds.includes(taskId)) {
    current.completedIds = [...current.completedIds, taskId]
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DAILY_ROUTINE_STORAGE_KEY, JSON.stringify(current))
    } catch {
      // Ignore quota errors
    }
  }
  return current
}

export function buildDailyRoutineTasks(
  status: DailyRoutineStatus,
  options: {
    mistakeCount: number
    quickDrillRoute: string
  }
): DailyRoutineTaskView[] {
  const doneSet = new Set(status.completedIds)
  return [
    {
      id: 'daily-puzzle',
      title: '1 Teka-Teki Harian',
      subtitle: 'Pemanasan visi taktik cepat dengan posisi unik hari ini.',
      minutes: 1,
      done: doneSet.has('daily-puzzle'),
      to: '/puzzles?mode=daily',
      ctaLabel: 'Kerjakan'
    },
    {
      id: 'repertoire-drill',
      title: '1 Jalur Pembukaan atau Babak Akhir',
      subtitle: 'Jaga konsistensi ingatan jalur repertoar dan akurasi harian.',
      minutes: 2,
      done: doneSet.has('repertoire-drill'),
      to: options.quickDrillRoute,
      ctaLabel: 'Mulai Latihan'
    },
    {
      id: 'match-or-tactics',
      title:
        options.mistakeCount > 0
          ? `Tuntaskan Catatan Kesalahan (${options.mistakeCount})`
          : '1 Partai Sparring vs Bot',
      subtitle:
        options.mistakeCount > 0
          ? 'Bersihkan antrean kesalahanmu lalu uji kemampuan di Arena Bot.'
          : 'Mainkan 1 partai singkat dan bedah langkah kunci di Ulasan Permainan.',
      minutes: 2,
      done: doneSet.has('match-or-tactics'),
      to: '/play',
      ctaLabel: 'Buka Arena'
    }
  ]
}
