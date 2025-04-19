"use server"

import { scrapeBirminghamCentralMosqueTimes, type MosquePrayerTimes } from "./scrape-prayer-times"
import { fetchMosqueApi, type MosqueApiPrayerTimes } from "./fetch-mosque-api"

export type CombinedPrayerTimes = MosquePrayerTimes | MosqueApiPrayerTimes

export async function getBirminghamCentralMosqueTimes(): Promise<CombinedPrayerTimes | null> {
  // First try the API if available
  const apiTimes = await fetchMosqueApi()
  if (apiTimes) {
    return apiTimes
  }

  // If API fails, try scraping
  const scrapedTimes = await scrapeBirminghamCentralMosqueTimes()
  if (scrapedTimes) {
    return scrapedTimes
  }

  // Both methods failed
  return null
}
