"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Volume2, VolumeX, Play, AlertCircle } from "lucide-react"
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
  const [isPlaying, setIsPlaying] = useState(false)
  const [playError, setPlayError] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Initialize from the service
    setAdhanEnabled(adhanService.isPrayerEnabled(name))
  }, [name])

  let headerClass = "bg-muted text-muted-foreground"
  let borderClass = ""

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
    if (isPlaying) return

    setIsPlaying(true)
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
    }

    // Set a timeout to reset the playing state after a few seconds
    // This is a fallback in case the 'ended' event doesn't fire
    setTimeout(() => {
      if (adhanService.isPlaying()) {
        // Still playing according to the service
      } else {
        setIsPlaying(false)
      }
    }, 3000)
  }

  // Check if adhan is still playing
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (isPlaying && !adhanService.isPlaying()) {
        setIsPlaying(false)
      }
    }, 1000)

    return () => clearInterval(checkInterval)
  }, [isPlaying])

  return (
    <Card className={`overflow-hidden ${borderClass}`}>
      <CardContent className="p-0">
        <div className={`p-2 ${headerClass} flex justify-between items-center`}>
          <h3 className="font-medium text-center flex-1">{name}</h3>
          <div className="flex items-center">
            <button
              onClick={playAdhan}
              className="p-1 rounded-full hover:bg-white/20 transition-colors mr-1"
              aria-label="Play adhan for this prayer"
              disabled={isPlaying}
            >
              {playError ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Play className={`h-4 w-4 ${isPlaying ? "opacity-50" : ""}`} />
              )}
            </button>
            <button
              onClick={toggleAdhan}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label={adhanEnabled ? "Disable adhan for this prayer" : "Enable adhan for this prayer"}
            >
              {adhanEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="p-4 flex justify-center items-center">
          <span className="text-2xl font-bold">{time}</span>
        </div>
        {isCurrent && (
          <div className="bg-amber-600/20 text-amber-600 text-xs text-center py-1 font-medium">Current</div>
        )}
        {isNext && !isCurrent && (
          <div className="bg-primary/20 text-primary text-xs text-center py-1 font-medium">Next</div>
        )}
      </CardContent>
    </Card>
  )
}
