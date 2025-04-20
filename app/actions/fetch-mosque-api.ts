"use server"

import { format } from "date-fns"

export interface MosqueApiPrayerTimes {
  date: string
  hijriDate: string
  Fajr: string
  Sunrise: string
  Zuhr: string
  Asr: string
  Maghrib: string
  Isha: string
  day: number
  month: number
  year: number
}

export async function fetchMosqueApi(): Promise<MosqueApiPrayerTimes | null> {
  try {
    // Try to fetch from a potential API endpoint
    // Note: This is a hypothetical endpoint - replace with actual endpoint if available
    const response = await fetch("https://centralmosque.org.uk/api/prayer-times", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      return null // API not available or error
    }

    const data = await response.json()
    const today = new Date()

    // Format the data according to our interface
    return {
      date: format(today, "EEEE, do MMMM yyyy"),
      hijriDate: data.hijriDate || "",
      Fajr: data.fajr || "",
      Sunrise: data.sunrise || "",
      Zuhr: data.zuhr || "",
      Asr: data.asr || "",
      Maghrib: data.maghrib || "",
      Isha: data.isha || "",
      day: today.getDate(),
      month: today.getMonth() + 1,
      year: today.getFullYear(),
    }
  } catch (error) {
    console.error("Error fetching from mosque API:", error)
    return null
  }
}