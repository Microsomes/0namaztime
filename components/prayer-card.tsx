"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Volume2, VolumeX, Play, AlertCircle, Square } from "lucide-react"
import adhanService from "@/services/adhan-service"
import { useToast } from "@/components/ui/use-toast"

interface PrayerCardProps {
  name: string
  time: string
  isCurrent: boolean
  isNext: boolean
}

export function PrayerCard({ name, time, isCurrent, isNext }: PrayerCardProps) {
  const [adhanEnabled, setAdhanEnabled] = useState(false)
  const [isPlayingLocal, setIsPlayingLocal] = useState(false)
  const [playError, setPlayError] = useState(false)
  const { toast } = useToast()

  // Compute if this prayer is currently playing
  const isPlaying = adhanService.isPlaying() && 
    (adhanService.getCurrentlyPlayingPrayer() === name || 
     adhanService.getCurrentlyPlayingPrayer() === adhanService.normalizePrayerName(name))

  useEffect(() => {
    // Initialize from the service
    setAdhanEnabled(adhanService.isPrayerEnabled(name))
  }, [name])

  let headerClass = "bg-muted text-muted-foreground"
  let borderClass = ""
  let cardSize = isCurrent || isNext ? "large" : "small"

  if (isCurrent) {
    headerClass = "bg-amber-600 text-white"
    borderClass = "border-amber-600 border-2"
  } else if (isNext) {
    headerClass = "bg-primary text-primary-foreground"
    borderClass = "border-primary border-2"
  }

  const toggleAdhan = () => {
    const newState = adhanService.togglePrayer(name)
    setAdhanEnabled(newState)
  }

  const playAdhan = async () => {
    if (adhanService.isPlaying()) return

    setIsPlayingLocal(true)
    setPlayError(false)

    try {
      const played = await adhanService.playAdhan(name, true) // true indicates manual play

      if (!played) {
        console.error("Failed to play adhan")
        setPlayError(true)
        toast({
          title: "Adhan Playback Error",
          description: "Could not play the adhan sound. Please check your audio settings.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error playing adhan:", error)
      setPlayError(true)
      toast({
        title: "Adhan Playback Error",
        description: "An error occurred while playing the adhan.",
        variant: "destructive",
      })
    } finally {
      setIsPlayingLocal(false)
    }
  }

  const stopAdhan = () => {
    adhanService.stopAdhan()
  }

  // Subscribe to adhan service state changes
  useEffect(() => {
    // Subscribe to changes in the adhan service
    const unsubscribe = adhanService.subscribe(() => {
      // Force re-render when adhan service state changes
      setIsPlayingLocal(prev => !prev)
    })

    // Cleanup subscription when component unmounts
    return () => unsubscribe()
  }, [])

  const animationClass = isCurrent ? "animate-scale-in animate-glow prayer-card" : 
                        isNext ? "animate-from-right prayer-card" : 
                        "animate-fade-in prayer-card";
                        
  // Special animation for current prayer
  const currentClass = isCurrent ? "current-prayer-highlight" : "";

  return (
    <Card className={`overflow-hidden ${borderClass} ${animationClass} ${currentClass}`}>
      <CardContent className="p-0">
        <div className={`p-1 ${headerClass} flex justify-between items-center`}>
          <h3 className={`font-medium text-center flex-1 ${cardSize === "large" ? "text-base" : "text-xs"}`}>{name}</h3>
          {(isCurrent || isNext) && (
            <div className="flex items-center">
              {isPlaying ? (
                <button
                  onClick={stopAdhan}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors animate-pulse"
                  aria-label="Stop adhan"
                >
                  <Square className="h-3 w-3" />
                </button>
              ) : (
                <button
                  onClick={playAdhan}
                  className="p-1 rounded-full hover:bg-white/20 transition-colors"
                  aria-label="Play adhan for this prayer"
                  disabled={isPlaying}
                >
                  {playError ? (
                    <AlertCircle className="h-3 w-3 text-red-500 animate-pulse" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
        <div className={`p-2 flex justify-center items-center ${cardSize === "large" ? "py-4" : ""}`}>
          <span className={`font-bold ${cardSize === "large" ? "text-2xl" : "text-lg"}`}>{time}</span>
        </div>
        {isCurrent && (
          <div className="bg-amber-600/20 text-amber-600 text-2xs text-center py-1 font-medium animate-pulse">Current</div>
        )}
        {isNext && !isCurrent && (
          <div className="bg-primary/20 text-primary text-2xs text-center py-1 font-medium animate-shimmer">Next</div>
        )}
      </CardContent>
    </Card>
  )
}