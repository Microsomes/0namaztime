class AdhanService {
  private adhanAudio: HTMLAudioElement | null = null
  private initialized = false
  private prayerSettings: Record<string, boolean> = {}
  private lastPlayedPrayer: string | null = null
  private lastPlayedDate: string | null = null
  private isCurrentlyPlaying = false
  private audioLoaded = false

  constructor() {
    if (typeof window !== "undefined") {
      this.loadSettings()
    }
  }

  initialize() {
    if (typeof window === "undefined") return false

    try {
      // Create the adhan audio element
      this.adhanAudio = new Audio()

      // Add event listeners for debugging
      this.adhanAudio.addEventListener("canplaythrough", () => {
        console.log("Adhan audio loaded and can play through")
        this.audioLoaded = true
      })

      this.adhanAudio.addEventListener("error", (e) => {
        console.error("Error loading adhan audio:", e)
        this.audioLoaded = false
      })

      // Add event listener for when adhan finishes playing
      this.adhanAudio.addEventListener("ended", () => {
        console.log("Adhan playback ended")
        this.isCurrentlyPlaying = false
      })

      // Set audio properties
      this.adhanAudio.src = "https://pub-91fa7140c07e4e3c8363e1bce76a937f.r2.dev/adhan.mp3"
      this.adhanAudio.preload = "auto"

      this.initialized = true
      this.loadSettings()
      return true
    } catch (error) {
      console.error("Error initializing adhan service:", error)
      return false
    }
  }

  async testAudio(): Promise<boolean> {
    if (!this.adhanAudio) {
      this.initialize()
    }

    if (!this.adhanAudio) {
      return false
    }

    try {
      // Check if the browser supports audio playback
      if (this.adhanAudio.canPlayType("audio/mpeg")) {
        // Try to load the audio file
        this.adhanAudio.load()
        return true
      } else {
        console.error("Browser does not support MP3 playback")
        return false
      }
    } catch (error) {
      console.error("Error testing audio playback:", error)
      return false
    }
  }

  loadSettings() {
    try {
      const savedSettings = localStorage.getItem("adhanSettings")
      if (savedSettings) {
        this.prayerSettings = JSON.parse(savedSettings)
      } else {
        // Default all prayers to enabled
        this.prayerSettings = {
          Fajr: true,
          Sunrise: false, // Usually no adhan for sunrise
          Dhuhr: true,
          Asr: true,
          Maghrib: true,
          Isha: true,
        }
        this.saveSettings()
      }

      // Load last played info
      this.lastPlayedPrayer = localStorage.getItem("lastPlayedPrayer")
      this.lastPlayedDate = localStorage.getItem("lastPlayedDate")
    } catch (error) {
      console.error("Error loading adhan settings:", error)
    }
  }

  saveSettings() {
    try {
      localStorage.setItem("adhanSettings", JSON.stringify(this.prayerSettings))
    } catch (error) {
      console.error("Error saving adhan settings:", error)
    }
  }

  isPrayerEnabled(prayerName: string): boolean {
    return this.prayerSettings[prayerName] || false
  }

  togglePrayer(prayerName: string) {
    this.prayerSettings[prayerName] = !this.isPrayerEnabled(prayerName)
    this.saveSettings()
    return this.isPrayerEnabled(prayerName)
  }

  shouldPlayAdhan(prayerName: string, isManualPlay = false): boolean {
    if (!this.initialized) {
      return false
    }

    // For manual play, we only check if the service is initialized
    if (isManualPlay) {
      return true
    }

    // For automatic play, we check if the prayer is enabled
    if (!this.isPrayerEnabled(prayerName)) {
      return false
    }

    const today = new Date().toISOString().split("T")[0]

    // Don't play if we've already played this prayer today
    if (this.lastPlayedPrayer === prayerName && this.lastPlayedDate === today) {
      return false
    }

    return true
  }

  async playAdhan(prayerName: string, isManualPlay = false): Promise<boolean> {
    console.log(`Attempting to play adhan for ${prayerName}, manual: ${isManualPlay}`)

    if (!this.initialized || !this.adhanAudio) {
      console.log("Adhan service not initialized, initializing now")
      this.initialize()
    }

    if (!this.adhanAudio) {
      console.error("Failed to initialize adhan audio")
      return false
    }

    if (!this.shouldPlayAdhan(prayerName, isManualPlay)) {
      console.log("Should not play adhan for this prayer")
      return false
    }

    // Don't play if already playing
    if (this.isCurrentlyPlaying) {
      console.log("Adhan is already playing")
      return false
    }

    try {
      // Reset the audio if it was playing
      this.adhanAudio.pause()
      this.adhanAudio.currentTime = 0

      // Make sure the audio is loaded
      if (!this.audioLoaded) {
        console.log("Audio not loaded, loading now")
        this.adhanAudio.load()
      }

      // Set volume to make sure it's audible
      this.adhanAudio.volume = 1.0

      console.log("Playing adhan...")
      this.isCurrentlyPlaying = true

      // Play the adhan
      try {
        await this.adhanAudio.play()
        console.log("Adhan playback started successfully")
      } catch (playError) {
        console.error("Error playing adhan:", playError)
        this.isCurrentlyPlaying = false
        return false
      }

      // Only record automatic plays (not manual ones)
      if (!isManualPlay) {
        // Record that we played this prayer today
        const today = new Date().toISOString().split("T")[0]
        this.lastPlayedPrayer = prayerName
        this.lastPlayedDate = today
        localStorage.setItem("lastPlayedPrayer", prayerName)
        localStorage.setItem("lastPlayedDate", today)
      }

      return true
    } catch (error) {
      console.error("Error in playAdhan:", error)
      this.isCurrentlyPlaying = false
      return false
    }
  }

  stopAdhan() {
    if (this.adhanAudio) {
      this.adhanAudio.pause()
      this.adhanAudio.currentTime = 0
      this.isCurrentlyPlaying = false
    }
  }

  isPlaying(): boolean {
    return this.isCurrentlyPlaying
  }

  timeToDate(timeStr: string, today = new Date()): Date {
    const [hours, minutes] = timeStr.split(":").map(Number)
    const date = new Date(today)
    date.setHours(hours, minutes, 0, 0)
    return date
  }
}

// Create a singleton instance
const adhanService = new AdhanService()

export default adhanService
