const STORAGE_PREFIX = 'smartcard_study_stats_'

function getStorageKey(userId) {
  return `${STORAGE_PREFIX}${userId || 'guest'}`
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getYesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function defaultStats() {
  return {
    streak: 0,
    lastStudyDate: null,
    totalReviewed: 0,
    cardStatusesByDeck: {},
    recentDecks: [],
  }
}

export function loadStudyStats(userId) {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    if (!raw) return defaultStats()
    return { ...defaultStats(), ...JSON.parse(raw) }
  } catch {
    return defaultStats()
  }
}

function saveStudyStats(userId, stats) {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(stats))
  } catch {
    // Ignore storage quota errors
  }
}

export function getDeckCardStatuses(userId, deckId) {
  const stats = loadStudyStats(userId)
  return stats.cardStatusesByDeck[String(deckId)] || {}
}

export function recordDeckStudyActivity(userId, deck, cardId, status) {
  const stats = loadStudyStats(userId)
  const today = getTodayKey()
  const yesterday = getYesterdayKey()

  let nextStreak = stats.streak || 0
  if (stats.lastStudyDate !== today) {
    nextStreak = stats.lastStudyDate === yesterday ? nextStreak + 1 : 1
  }

  const deckKey = String(deck.id)
  const prevStatuses = stats.cardStatusesByDeck[deckKey] || {}
  const nextStatuses = cardId && status ? { ...prevStatuses, [cardId]: status } : prevStatuses

  const recentFiltered = (stats.recentDecks || []).filter((item) => String(item.id) !== deckKey)
  const nextRecent = [
    {
      id: deck.id,
      title: deck.title,
      subject: deck.subject || 'Khác',
      lastStudiedAt: new Date().toISOString(),
    },
    ...recentFiltered,
  ].slice(0, 6)

  const nextStats = {
    streak: nextStreak,
    lastStudyDate: today,
    totalReviewed: (stats.totalReviewed || 0) + (cardId ? 1 : 0),
    cardStatusesByDeck: {
      ...stats.cardStatusesByDeck,
      [deckKey]: nextStatuses,
    },
    recentDecks: nextRecent,
  }

  saveStudyStats(userId, nextStats)
  return nextStats
}

export function clearDeckCardStatuses(userId, deckId) {
  const stats = loadStudyStats(userId)
  const nextByDeck = { ...stats.cardStatusesByDeck }
  delete nextByDeck[String(deckId)]
  const nextStats = { ...stats, cardStatusesByDeck: nextByDeck }
  saveStudyStats(userId, nextStats)
  return nextStats
}
