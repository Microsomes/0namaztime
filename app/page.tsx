"use client"

import { useEffect, useState } from "react"
import { format } from "date-fns"
import { Calendar, Clock, Moon, RefreshCw, Sun, Volume2, Maximize, Minimize } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { getBirminghamCentralMosqueTimes, type CombinedPrayerTimes } from "./actions/get-prayer-times"
import { AdhanPermission } from "@/components/adhan-permission"
import { PrayerCard } from "@/components/prayer-card"
import adhanService from "@/services/adhan-service"
import { useToast } from "@/components/ui/use-toast"
import moment from "moment-hijri"

interface Prayer {
  name: string
  time: string
  minutes: number
}

export default function Home() {
  const [prayerTimes, setPrayerTimes] = useState<CombinedPrayerTimes | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [adhanPermission, setAdhanPermission] = useState<"unknown" | "granted" | "denied">("unknown")
  const [testingAdhan, setTestingAdhan] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const { setTheme, theme } = useTheme()
  const { toast } = useToast()

  const fetchPrayerTimes = async () => {
    setLoading(true)
    setError(null)
    try {
      // Use our combined function to get prayer times
      const times = await getBirminghamCentralMosqueTimes()

      if (!times) {
        throw new Error("Failed to fetch prayer times")
      }

      setPrayerTimes(times)
      setLastUpdated(new Date())
      localStorage.setItem("prayerTimes", JSON.stringify(times))
      localStorage.setItem("lastUpdated", new Date().toISOString().split("T")[0])
    } catch (err) {
      console.error("Error fetching prayer times:", err)
      setError("Could not load prayer times. Please check your connection and try again.")

      // Try to load from cache if available
      const cachedTimes = localStorage.getItem("prayerTimes")
      if (cachedTimes) {
        setPrayerTimes(JSON.parse(cachedTimes))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Check if we need to refresh data (new day or first load)
    const lastUpdatedDate = localStorage.getItem("lastUpdated")
    const today = new Date().toISOString().split("T")[0]

    if (!lastUpdatedDate || lastUpdatedDate !== today) {
      fetchPrayerTimes()
    } else {
      // Load from cache if it's the same day
      const cachedTimes = localStorage.getItem("prayerTimes")
      if (cachedTimes) {
        setPrayerTimes(JSON.parse(cachedTimes))
        setLastUpdated(new Date())
        setLoading(false)
      } else {
        fetchPrayerTimes()
      }
    }

    // Set up a timer to check for date change every minute
    const dateCheckInterval = setInterval(() => {
      const currentDate = new Date().toISOString().split("T")[0]
      const lastSavedDate = localStorage.getItem("lastUpdated")

      if (lastSavedDate !== currentDate) {
        fetchPrayerTimes()
      }

      // Update current time every minute for countdown
      setCurrentTime(new Date())
    }, 60000)

    // Update current time every second for more accurate countdown
    const timeUpdateInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => {
      clearInterval(dateCheckInterval)
      clearInterval(timeUpdateInterval)
    }
  }, [])

  // Check if it's time to play adhan
  useEffect(() => {
    if (adhanPermission !== "granted" || !prayerTimes) return

    const prayers = getPrayerTimesArray()
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentSeconds = now.getSeconds()

    // Only check in the first 5 seconds of each minute to avoid multiple triggers
    if (currentSeconds > 5) return

    // Check each prayer time
    for (const prayer of prayers) {
      if (!prayer.time || prayer.time === "N/A") continue

      // Extract hours and minutes from prayer time
      const [prayerHour, prayerMinute] = getHoursMinutes(prayer.time)

      // Check if it's exactly prayer time
      if (currentHour === prayerHour && currentMinute === prayerMinute) {
        // Check if adhan is not already playing to avoid multiple plays
        if (!adhanService.isPlaying()) {
          console.log(`Prayer time: ${prayer.name} - Playing adhan automatically`)
          adhanService.playAdhan(prayer.name)
          
          toast({
            title: "Prayer Time",
            description: `It's time for ${prayer.name} prayer.`,
          })
        }
        break
      }
    }
  }, [currentTime, prayerTimes, adhanPermission, toast])

  const getHoursMinutes = (timeStr: string): [number, number] => {
    // Handle 12-hour format (e.g., "6:30 AM")
    if (timeStr.toLowerCase().includes("am") || timeStr.toLowerCase().includes("pm")) {
      const isPM = timeStr.toLowerCase().includes("pm")
      const timePart = timeStr.toLowerCase().replace("am", "").replace("pm", "").trim()
      const [hours, minutes] = timePart.split(":").map(Number)

      let hour = hours
      if (isPM && hour !== 12) {
        hour += 12
      } else if (!isPM && hour === 12) {
        hour = 0
      }

      return [hour, minutes]
    }

    // Handle 24-hour format (e.g., "18:30")
    const [hours, minutes] = timeStr.split(":")
    let hour = Number.parseInt(hours, 10)

    // Ensure Dhuhr, Asr, Maghrib, and Isha are treated as PM times
    // This is a safety check for incorrectly formatted times
    if (
      (hour < 12 && timeStr.includes("Zuhr")) ||
      timeStr.includes("Dhuhr") ||
      timeStr.includes("Asr") ||
      timeStr.includes("Maghrib") ||
      timeStr.includes("Isha")
    ) {
      hour += 12
    }

    return [hour, minutes]
  }

  const formatTime = (time: string) => {
    if (!time || time === "N/A") return "N/A"

    // Check if the time is already in 12-hour format
    if (time.toLowerCase().includes("am") || time.toLowerCase().includes("pm")) {
      return time
    }

    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = time.split(":")
    const hour = Number.parseInt(hours, 10)

    // Correctly determine AM/PM based on 24-hour format
    // Dhuhr, Asr, Maghrib, and Isha are always PM (except in extreme northern latitudes)
    let ampm = "AM"
    if (hour >= 12) {
      ampm = "PM"
    } else if (hour < 12 && ["Dhuhr", "Zuhr", "Asr", "Maghrib", "Isha"].some((name) => time.includes(name))) {
      // Force PM for these prayers even if the hour is less than 12
      // This is a fallback in case the time format is incorrect
      ampm = "PM"
    }

    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const getPrayerTimesArray = (): Prayer[] => {
    if (!prayerTimes) return []

    return [
      { name: "Fajr", time: prayerTimes.Fajr, minutes: timeToMinutes(prayerTimes.Fajr) },
      { name: "Sunrise", time: prayerTimes.Sunrise, minutes: timeToMinutes(prayerTimes.Sunrise) },
      { name: "Dhuhr", time: prayerTimes.Zuhr, minutes: timeToMinutes(prayerTimes.Zuhr) }, // Note: Using Zuhr from mosque
      { name: "Asr", time: prayerTimes.Asr, minutes: timeToMinutes(prayerTimes.Asr) },
      { name: "Maghrib", time: prayerTimes.Maghrib, minutes: timeToMinutes(prayerTimes.Maghrib) },
      { name: "Isha", time: prayerTimes.Isha, minutes: timeToMinutes(prayerTimes.Isha) },
    ]
  }

  const timeToMinutes = (time: string): number => {
    if (!time || time === "N/A") return 0

    // Handle if time is already in 12-hour format
    if (time.toLowerCase().includes("am") || time.toLowerCase().includes("pm")) {
      const isPM = time.toLowerCase().includes("pm")
      const timePart = time.toLowerCase().replace("am", "").replace("pm", "").trim()
      const [hours, minutes] = timePart.split(":")
      let hour = Number.parseInt(hours, 10)

      if (isPM && hour !== 12) {
        hour += 12
      } else if (!isPM && hour === 12) {
        hour = 0
      }

      return hour * 60 + Number.parseInt(minutes, 10)
    }

    // Handle 24-hour format
    const [hours, minutes] = time.split(":")
    let hour = Number.parseInt(hours, 10)

    // Ensure afternoon/evening prayers are treated as PM times
    // This is a safety check for incorrectly formatted times from the API/scraper
    if (hour < 12) {
      // These prayers are typically in the afternoon/evening
      if (["Zuhr", "Dhuhr", "Asr", "Maghrib", "Isha"].some((name) => time.includes(name))) {
        hour += 12
      }
    }

    return hour * 60 + Number.parseInt(minutes, 10)
  }

  const getCurrentAndNextPrayer = () => {
    if (!prayerTimes) return { current: null, next: null }

    const now = currentTime
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes()
    const prayers = getPrayerTimesArray()

    // Filter out prayers with invalid times
    const validPrayers = prayers.filter((prayer) => prayer.minutes > 0)

    if (validPrayers.length === 0) {
      return { current: null, next: null }
    }

    // Find the current and next prayer
    let currentPrayer: Prayer | null = null
    let nextPrayer: Prayer | null = null

    // Check if current time is before first prayer
    if (currentTimeInMinutes < validPrayers[0].minutes) {
      // Before first prayer, current is last prayer from yesterday
      currentPrayer = {
        ...validPrayers[validPrayers.length - 1],
        name: `${validPrayers[validPrayers.length - 1].name} (Yesterday)`,
      }
      nextPrayer = validPrayers[0]
    }
    // Check if current time is after last prayer
    else if (currentTimeInMinutes >= validPrayers[validPrayers.length - 1].minutes) {
      currentPrayer = validPrayers[validPrayers.length - 1]
      nextPrayer = { ...validPrayers[0], name: `${validPrayers[0].name} (Tomorrow)` }
    }
    // Current time is between prayers
    else {
      for (let i = 0; i < validPrayers.length - 1; i++) {
        if (currentTimeInMinutes >= validPrayers[i].minutes && currentTimeInMinutes < validPrayers[i + 1].minutes) {
          currentPrayer = validPrayers[i]
          nextPrayer = validPrayers[i + 1]
          break
        }
      }
    }

    return { current: currentPrayer, next: nextPrayer }
  }

  const getTimeUntilNextPrayer = () => {
    if (!nextPrayer) return ""

    const now = currentTime
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60

    let minutesUntilNext = nextPrayer.minutes - currentTimeInMinutes

    // If next prayer is tomorrow's first prayer
    if (minutesUntilNext < 0) {
      minutesUntilNext += 24 * 60 // Add 24 hours
    }

    const hours = Math.floor(minutesUntilNext / 60)
    const minutes = Math.floor(minutesUntilNext % 60)
    const seconds = Math.floor((minutesUntilNext % 1) * 60)

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else {
      return `${minutes}m ${seconds}s`
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  }

  const handleAdhanPermissionGranted = () => {
    setAdhanPermission("granted")
    // Toast removed to prevent alert spam
  }

  const handleAdhanPermissionDenied = () => {
    setAdhanPermission("denied")
  }

  const testAdhanSound = async () => {
    setTestingAdhan(true)
    try {
      // Initialize if not already
      adhanService.initialize()

      // Try to play a test sound
      const success = await adhanService.playAdhan("Test", true)

      if (success) {
        toast({
          title: "Adhan Test",
          description: "The adhan sound is playing. If you can't hear it, check your device volume.",
        })
      } else {
        toast({
          title: "Adhan Test Failed",
          description: "Could not play the adhan sound. Please check your audio settings.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error testing adhan:", error)
      toast({
        title: "Adhan Test Error",
        description: "An error occurred while testing the adhan sound.",
        variant: "destructive",
      })
    } finally {
      setTimeout(() => setTestingAdhan(false), 3000)
    }
  }

  const { current: currentPrayer, next: nextPrayer } = getCurrentAndNextPrayer()

  // Get the Hijri date using moment-hijri
  const hijriDate = moment().format('iDD iMMMM iYYYY');
  
  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-background">
      <AdhanPermission
        onPermissionGranted={handleAdhanPermissionGranted}
        onPermissionDenied={handleAdhanPermissionDenied}
      />

      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Birmingham Central Mosque</h1>
            {prayerTimes && (
              <div className="flex items-center text-sm text-muted-foreground mt-1">
                <Calendar className="h-4 w-4 mr-1" />
                <span>{prayerTimes.date}</span>
              </div>
            )}
            {/* Always show Hijri date regardless of mosque API response */}
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="italic">{hijriDate} AH</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={toggleFullscreen} className="h-9 w-9">
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={toggleTheme} className="h-9 w-9">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPrayerTimes}
              disabled={loading}
              className="flex items-center gap-1 h-9"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {adhanPermission === "granted" && (
          <div className="mb-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={testAdhanSound}
              disabled={testingAdhan}
              className="flex items-center gap-1"
            >
              <Volume2 className="h-4 w-4" />
              {testingAdhan ? "Testing..." : "Test Adhan Sound"}
            </Button>
          </div>
        )}

        {nextPrayer && (
          <Card className="mb-4 border-primary">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-foreground">Next Prayer</h3>
                  <p className="text-2xl font-bold text-primary">{nextPrayer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Time until</p>
                  <p className="text-2xl font-bold text-primary">{getTimeUntilNextPrayer()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="bg-destructive/20 border border-destructive text-destructive-foreground px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          prayerTimes && (
            <div className="flex flex-col gap-4">
              {/* Current Prayer - Full Width */}
              {currentPrayer && (
                <div className="w-full">
                  {currentPrayer.name === "Fajr" || currentPrayer.name === "Fajr (Yesterday)" ? (
                    <PrayerCard
                      name="Fajr"
                      time={formatTime(prayerTimes.Fajr)}
                      isCurrent={true}
                      isNext={false}
                    />
                  ) : currentPrayer.name === "Sunrise" ? (
                    <PrayerCard
                      name="Sunrise"
                      time={formatTime(prayerTimes.Sunrise)}
                      isCurrent={true}
                      isNext={false}
                    />
                  ) : currentPrayer.name === "Dhuhr" ? (
                    <PrayerCard
                      name="Dhuhr"
                      time={formatTime(prayerTimes.Zuhr)}
                      isCurrent={true}
                      isNext={false}
                    />
                  ) : currentPrayer.name === "Asr" ? (
                    <PrayerCard
                      name="Asr"
                      time={formatTime(prayerTimes.Asr)}
                      isCurrent={true}
                      isNext={false}
                    />
                  ) : currentPrayer.name === "Maghrib" ? (
                    <PrayerCard
                      name="Maghrib"
                      time={formatTime(prayerTimes.Maghrib)}
                      isCurrent={true}
                      isNext={false}
                    />
                  ) : (
                    <PrayerCard
                      name="Isha"
                      time={formatTime(prayerTimes.Isha)}
                      isCurrent={true}
                      isNext={false}
                    />
                  )}
                </div>
              )}
              
              {/* Next Prayer - Full Width */}
              {nextPrayer && (
                <div className="w-full">
                  {nextPrayer.name === "Fajr" || nextPrayer.name === "Fajr (Tomorrow)" ? (
                    <PrayerCard
                      name="Fajr"
                      time={formatTime(prayerTimes.Fajr)}
                      isCurrent={false}
                      isNext={true}
                    />
                  ) : nextPrayer.name === "Sunrise" ? (
                    <PrayerCard
                      name="Sunrise"
                      time={formatTime(prayerTimes.Sunrise)}
                      isCurrent={false}
                      isNext={true}
                    />
                  ) : nextPrayer.name === "Dhuhr" ? (
                    <PrayerCard
                      name="Dhuhr"
                      time={formatTime(prayerTimes.Zuhr)}
                      isCurrent={false}
                      isNext={true}
                    />
                  ) : nextPrayer.name === "Asr" ? (
                    <PrayerCard
                      name="Asr"
                      time={formatTime(prayerTimes.Asr)}
                      isCurrent={false}
                      isNext={true}
                    />
                  ) : nextPrayer.name === "Maghrib" ? (
                    <PrayerCard
                      name="Maghrib"
                      time={formatTime(prayerTimes.Maghrib)}
                      isCurrent={false}
                      isNext={true}
                    />
                  ) : (
                    <PrayerCard
                      name="Isha"
                      time={formatTime(prayerTimes.Isha)}
                      isCurrent={false}
                      isNext={true}
                    />
                  )}
                </div>
              )}
              
              {/* Remaining Prayers - Grid Layout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(currentPrayer?.name !== "Fajr" && currentPrayer?.name !== "Fajr (Yesterday)" && 
                  nextPrayer?.name !== "Fajr" && nextPrayer?.name !== "Fajr (Tomorrow)") && (
                  <PrayerCard
                    name="Fajr"
                    time={formatTime(prayerTimes.Fajr)}
                    isCurrent={false}
                    isNext={false}
                  />
                )}
                
                {currentPrayer?.name !== "Sunrise" && nextPrayer?.name !== "Sunrise" && (
                  <PrayerCard
                    name="Sunrise"
                    time={formatTime(prayerTimes.Sunrise)}
                    isCurrent={false}
                    isNext={false}
                  />
                )}
                
                {currentPrayer?.name !== "Dhuhr" && nextPrayer?.name !== "Dhuhr" && (
                  <PrayerCard
                    name="Dhuhr"
                    time={formatTime(prayerTimes.Zuhr)}
                    isCurrent={false}
                    isNext={false}
                  />
                )}
                
                {currentPrayer?.name !== "Asr" && nextPrayer?.name !== "Asr" && (
                  <PrayerCard
                    name="Asr"
                    time={formatTime(prayerTimes.Asr)}
                    isCurrent={false}
                    isNext={false}
                  />
                )}
                
                {currentPrayer?.name !== "Maghrib" && nextPrayer?.name !== "Maghrib" && (
                  <PrayerCard
                    name="Maghrib"
                    time={formatTime(prayerTimes.Maghrib)}
                    isCurrent={false}
                    isNext={false}
                  />
                )}
                
                {(currentPrayer?.name !== "Isha" && currentPrayer?.name !== "Isha (Yesterday)" && 
                  nextPrayer?.name !== "Isha" && nextPrayer?.name !== "Isha (Tomorrow)") && (
                  <PrayerCard
                    name="Isha"
                    time={formatTime(prayerTimes.Isha)}
                    isCurrent={false}
                    isNext={false}
                  />
                )}
              </div>
            </div>
          )
        )}

        {lastUpdated && (
          <div className="text-xs text-muted-foreground mt-4 text-center flex items-center justify-center">
            <Clock className="h-3 w-3 mr-1" />
            Last updated: {format(lastUpdated, "HH:mm")}
          </div>
        )}
      </div>
    </main>
  )
}
