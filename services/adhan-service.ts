class AdhanService {
  private adhanAudio: HTMLAudioElement | null = null
  private initialized = false
  private prayerSettings: Record<string, boolean> = {}
  private lastPlayedPrayer: string | null = null
  private lastPlayedDate: string | null = null
  private isCurrentlyPlaying = false
  private audioLoaded = false
  private listeners: Set<() => void> = new Set()

  constructor() {
    if (typeof window !== "undefined") {
      this.loadSettings()
    }
  }

  // Event emitter methods
  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener())
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
        this.lastPlayedPrayer = null
        this.notifyListeners()
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
    // Normalize Dhuhr/Zuhr naming variants
    const normalizedName = this.normalizePrayerName(prayerName)
    return this.prayerSettings[normalizedName] || false
  }

  togglePrayer(prayerName: string) {
    // Normalize Dhuhr/Zuhr naming variants
    const normalizedName = this.normalizePrayerName(prayerName)
    this.prayerSettings[normalizedName] = !this.isPrayerEnabled(prayerName)
    this.saveSettings()
    return this.isPrayerEnabled(prayerName)
  }

  shouldPlayAdhan(prayerName: string, isManualPlay = false): boolean {
    if (!this.initialized) {
      return false
    }

    // Normalize prayer name
    const normalizedName = this.normalizePrayerName(prayerName);

    // For manual play, we only check if the service is initialized
    if (isManualPlay) {
      return true
    }

    // For automatic play, we check if the prayer is enabled
    if (!this.isPrayerEnabled(normalizedName)) {
      return false
    }

    const today = new Date().toISOString().split("T")[0]

    // Don't play if we've already played this prayer today
    if (this.lastPlayedPrayer === normalizedName && this.lastPlayedDate === today) {
      return false
    }

    return true
  }

  async playAdhan(prayerName: string, isManualPlay = false): Promise<boolean> {
    console.log(`Attempting to play adhan for ${prayerName}, manual: ${isManualPlay}`)
    
    // Normalize the prayer name
    const normalizedName = this.normalizePrayerName(prayerName);
    console.log(`Normalized prayer name: ${normalizedName}`);

    if (!this.initialized || !this.adhanAudio) {
      console.log("Adhan service not initialized, initializing now")
      this.initialize()
    }

    if (!this.adhanAudio) {
      console.error("Failed to initialize adhan audio")
      return false
    }

    if (!this.shouldPlayAdhan(normalizedName, isManualPlay)) {
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
      this.lastPlayedPrayer = normalizedName // Always set the currently playing prayer
      this.notifyListeners() // Notify listeners about state change

      // Play the adhan
      try {
        await this.adhanAudio.play()
        console.log("Adhan playback started successfully")
      } catch (playError) {
        console.error("Error playing adhan:", playError)
        this.isCurrentlyPlaying = false
        this.lastPlayedPrayer = null
        this.notifyListeners() // Notify listeners about state change
        return false
      }

      // Only record automatic plays (not manual ones) in localStorage
      if (!isManualPlay) {
        // Record that we played this prayer today
        const today = new Date().toISOString().split("T")[0]
        this.lastPlayedDate = today
        localStorage.setItem("lastPlayedPrayer", normalizedName)
        localStorage.setItem("lastPlayedDate", today)
      }

      return true
    } catch (error) {
      console.error("Error in playAdhan:", error)
      this.isCurrentlyPlaying = false
      this.lastPlayedPrayer = null
      this.notifyListeners() // Notify listeners about state change
      return false
    }
  }

  stopAdhan() {
    console.log("Stopping adhan playback")
    if (this.adhanAudio) {
      this.adhanAudio.pause()
      this.adhanAudio.currentTime = 0
      this.isCurrentlyPlaying = false
      this.lastPlayedPrayer = null
      this.notifyListeners() // Notify listeners about state change
      console.log("Adhan playback stopped")
    }
  }

  isPlaying(): boolean {
    return this.isCurrentlyPlaying
  }
  
  getCurrentlyPlayingPrayer(): string | null {
    return this.isCurrentlyPlaying ? this.lastPlayedPrayer : null
  }
  
  // Normalize prayer names to handle variants like Zuhr/Dhuhr
  normalizePrayerName(prayerName: string): string {
    if (prayerName === "Zuhr") return "Dhuhr";
    return prayerName;
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