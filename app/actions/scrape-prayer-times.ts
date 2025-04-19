"use server"

import * as cheerio from "cheerio"
import { format } from "date-fns"

export interface MosquePrayerTimes {
  date: string
  hijriDate: string
  Fajr: string
  Sunrise: string
  Zuhr: string // Note: Zuhr instead of Dhuhr in some mosques
  Asr: string
  Maghrib: string
  Isha: string
  day: number
  month: number
  year: number
}

// Update the ensureCorrectTimeFormat function to handle prayer names
function ensureCorrectTimeFormat(timeStr: string, prayerName?: string): string {
  // If already in 24-hour format (e.g., "14:30"), return as is
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    // Check if we need to adjust the hour for afternoon prayers
    if (prayerName && ["Zuhr", "Dhuhr", "Asr", "Maghrib", "Isha"].includes(prayerName)) {
      const [hours, minutes] = timeStr.split(":")
      let hour = Number.parseInt(hours, 10)

      // If hour is less than 12 for afternoon prayers, add 12 to convert to PM
      if (hour < 12) {
        hour += 12
      }

      return `${hour.toString().padStart(2, "0")}:${minutes}`
    }
    return timeStr
  }

  // If in 12-hour format with AM/PM
  if (/^\d{1,2}:\d{2}\s*(am|pm)$/i.test(timeStr)) {
    const isPM = timeStr.toLowerCase().includes("pm")
    const timePart = timeStr.toLowerCase().replace("am", "").replace("pm", "").trim()
    const [hours, minutes] = timePart.split(":")
    let hour = Number.parseInt(hours, 10)

    // Convert to 24-hour format
    if (isPM && hour !== 12) {
      hour += 12
    } else if (!isPM && hour === 12) {
      hour = 0
    }

    // Force afternoon prayers to be PM if they're incorrectly marked as AM
    if (!isPM && prayerName && ["Zuhr", "Dhuhr", "Asr", "Maghrib", "Isha"].includes(prayerName) && hour < 12) {
      hour += 12
    }

    return `${hour.toString().padStart(2, "0")}:${minutes}`
  }

  // If just a time without format, assume it's in 24-hour format
  return timeStr
}

export async function scrapeBirminghamCentralMosqueTimes(): Promise<MosquePrayerTimes | null> {
  try {
    // Fetch the HTML content from the Birmingham Central Mosque website
    const response = await fetch("https://centralmosque.org.uk/", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`)
    }

    const html = await response.text()

    // Load the HTML content into cheerio
    const $ = cheerio.load(html)

    // Extract prayer times from the table
    // Note: Selectors may need to be adjusted based on the actual website structure
    const today = new Date()

    // Find the prayer times table - this selector might need adjustment
    const prayerTimesTable = $(".prayer-times-table")

    // Extract the prayer times for today
    let prayerTimes: MosquePrayerTimes | null = null

    // Try to find today's date in the table
    const day = today.getDate()
    const month = today.getMonth() + 1
    const year = today.getFullYear()

    // Look for the row containing today's date
    prayerTimesTable.find("tr").each((i, row) => {
      const dateCell = $(row).find("td:first-child").text().trim()

      // Check if this row contains today's date
      if (dateCell.includes(day.toString())) {
        // Extract prayer times from this row
        const cells = $(row).find("td")

        // Extract Hijri date - this might be in a different location
        const hijriDateElement = $(".hijri-date")
        const hijriDate = hijriDateElement.length ? hijriDateElement.text().trim() : ""

        prayerTimes = {
          date: format(today, "EEEE, do MMMM yyyy"),
          hijriDate: hijriDate || "Hijri date not available",
          Fajr: ensureCorrectTimeFormat($(cells[1]).text().trim(), "Fajr"),
          Sunrise: ensureCorrectTimeFormat($(cells[2]).text().trim(), "Sunrise"),
          Zuhr: ensureCorrectTimeFormat($(cells[3]).text().trim(), "Zuhr"), // Note: Zuhr instead of Dhuhr
          Asr: ensureCorrectTimeFormat($(cells[4]).text().trim(), "Asr"),
          Maghrib: ensureCorrectTimeFormat($(cells[5]).text().trim(), "Maghrib"),
          Isha: ensureCorrectTimeFormat($(cells[6]).text().trim(), "Isha"),
          day,
          month,
          year,
        }

        return false // Break the loop
      }
    })

    // If we couldn't find today's prayer times, try to extract from a different structure
    if (!prayerTimes) {
      // Look for prayer times in a different format (e.g., dedicated today's times section)
      const fajr = $(".prayer-time-fajr").text().trim() || $(".fajr-time").text().trim()
      const sunrise = $(".prayer-time-sunrise").text().trim() || $(".sunrise-time").text().trim()
      const zuhr = $(".prayer-time-zuhr").text().trim() || $(".zuhr-time").text().trim()
      const asr = $(".prayer-time-asr").text().trim() || $(".asr-time").text().trim()
      const maghrib = $(".prayer-time-maghrib").text().trim() || $(".maghrib-time").text().trim()
      const isha = $(".prayer-time-isha").text().trim() || $(".isha-time").text().trim()

      // Extract Hijri date if available
      const hijriDateElement = $(".hijri-date")
      const hijriDate = hijriDateElement.length ? hijriDateElement.text().trim() : ""

      if (fajr || zuhr || asr || maghrib || isha) {
        prayerTimes = {
          date: format(today, "EEEE, do MMMM yyyy"),
          hijriDate: hijriDate || "Hijri date not available",
          Fajr: ensureCorrectTimeFormat(fajr || "N/A", "Fajr"),
          Sunrise: ensureCorrectTimeFormat(sunrise || "N/A", "Sunrise"),
          Zuhr: ensureCorrectTimeFormat(zuhr || "N/A", "Zuhr"),
          Asr: ensureCorrectTimeFormat(asr || "N/A", "Asr"),
          Maghrib: ensureCorrectTimeFormat(maghrib || "N/A", "Maghrib"),
          Isha: ensureCorrectTimeFormat(isha || "N/A", "Isha"),
          day,
          month,
          year,
        }
      }
    }

    // If we still couldn't find the prayer times, try one more approach
    if (!prayerTimes) {
      // Look for any elements containing prayer time information
      const prayerTimeElements = $(
        '*:contains("Fajr"):contains("Zuhr"):contains("Asr"):contains("Maghrib"):contains("Isha")',
      )

      if (prayerTimeElements.length) {
        const elementText = prayerTimeElements.text()

        // Use regex to extract times
        const fajrMatch = elementText.match(/Fajr[:\s]+(\d{1,2}:\d{2})/i)
        const sunriseMatch = elementText.match(/Sunrise[:\s]+(\d{1,2}:\d{2})/i)
        const zuhrMatch =
          elementText.match(/Zuhr[:\s]+(\d{1,2}:\d{2})/i) || elementText.match(/Dhuhr[:\s]+(\d{1,2}:\d{2})/i)
        const asrMatch = elementText.match(/Asr[:\s]+(\d{1,2}:\d{2})/i)
        const maghribMatch = elementText.match(/Maghrib[:\s]+(\d{1,2}:\d{2})/i)
        const ishaMatch = elementText.match(/Isha[:\s]+(\d{1,2}:\d{2})/i)

        prayerTimes = {
          date: format(today, "EEEE, do MMMM yyyy"),
          hijriDate: "Hijri date not available",
          Fajr: ensureCorrectTimeFormat(fajrMatch ? fajrMatch[1] : "N/A", "Fajr"),
          Sunrise: ensureCorrectTimeFormat(sunriseMatch ? sunriseMatch[1] : "N/A", "Sunrise"),
          Zuhr: ensureCorrectTimeFormat(zuhrMatch ? zuhrMatch[1] : "N/A", "Zuhr"),
          Asr: ensureCorrectTimeFormat(asrMatch ? asrMatch[1] : "N/A", "Asr"),
          Maghrib: ensureCorrectTimeFormat(maghribMatch ? maghribMatch[1] : "N/A", "Maghrib"),
          Isha: ensureCorrectTimeFormat(ishaMatch ? ishaMatch[1] : "N/A", "Isha"),
          day,
          month,
          year,
        }
      }
    }

    // If we still couldn't find the prayer times, try a more direct approach
    // This is a fallback for when the website structure is different than expected
    if (!prayerTimes) {
      // Extract all text from the page and look for patterns
      const pageText = $("body").text()

      // Look for common patterns in prayer time displays
      const timePattern = /\b([01]?[0-9]|2[0-3]):[0-5][0-9]\b/g
      const times = pageText.match(timePattern)

      if (times && times.length >= 5) {
        // Assume the first 5-6 times found might be prayer times
        prayerTimes = {
          date: format(today, "EEEE, do MMMM yyyy"),
          hijriDate: "Hijri date not available",
          Fajr: ensureCorrectTimeFormat(times[0] || "N/A", "Fajr"),
          Sunrise: ensureCorrectTimeFormat(times[1] || "N/A", "Sunrise"),
          Zuhr: ensureCorrectTimeFormat(times[2] || "N/A", "Zuhr"),
          Asr: ensureCorrectTimeFormat(times[3] || "N/A", "Asr"),
          Maghrib: ensureCorrectTimeFormat(times[4] || "N/A", "Maghrib"),
          Isha: ensureCorrectTimeFormat(times[5] || "N/A", "Isha"),
          day,
          month,
          year,
        }
      }
    }

    return prayerTimes
  } catch (error) {
    console.error("Error scraping prayer times:", error)
    return null
  }
}
