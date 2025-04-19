"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Volume2, VolumeX } from "lucide-react"
import adhanService from "@/services/adhan-service"

interface AdhanPermissionProps {
  onPermissionGranted: () => void
  onPermissionDenied: () => void
}

export function AdhanPermission({ onPermissionGranted, onPermissionDenied }: AdhanPermissionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    // Check if we've already asked for permission
    const adhanPermission = localStorage.getItem("adhanPermission")

    if (adhanPermission === null) {
      // We haven't asked yet, show the prompt
      setIsVisible(true)
    } else if (adhanPermission === "granted") {
      // Permission was previously granted
      // Initialize the adhan service
      adhanService.initialize()
      onPermissionGranted()
    } else {
      // Permission was previously denied
      onPermissionDenied()
    }
  }, [onPermissionGranted, onPermissionDenied])

  const handleAllow = async () => {
    setIsInitializing(true)

    try {
      // Initialize the adhan service first
      const initialized = adhanService.initialize()

      if (initialized) {
        // Test if audio can be played
        const canPlay = await adhanService.testAudio()

        if (canPlay) {
          localStorage.setItem("adhanPermission", "granted")
          setIsVisible(false)
          onPermissionGranted()
        } else {
          console.warn("Audio playback may not be supported, but proceeding anyway")
          localStorage.setItem("adhanPermission", "granted")
          setIsVisible(false)
          onPermissionGranted()
        }
      } else {
        console.error("Failed to initialize audio service")
        localStorage.setItem("adhanPermission", "denied")
        setIsVisible(false)
        onPermissionDenied()
      }
    } catch (error) {
      console.error("Error initializing audio:", error)
      // If there's an error, we'll still close the dialog but mark as denied
      localStorage.setItem("adhanPermission", "denied")
      setIsVisible(false)
      onPermissionDenied()
    } finally {
      setIsInitializing(false)
    }
  }

  const handleDeny = () => {
    localStorage.setItem("adhanPermission", "denied")
    setIsVisible(false)
    onPermissionDenied()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Enable Adhan Notifications?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">
            Would you like to hear the adhan (call to prayer) when prayer times are reached?
          </p>
          <div className="flex justify-center items-center gap-8">
            <div className="flex flex-col items-center">
              <Volume2 className="h-12 w-12 text-primary mb-2" />
              <span className="text-sm">Enable Sound</span>
            </div>
            <div className="flex flex-col items-center">
              <VolumeX className="h-12 w-12 text-muted-foreground mb-2" />
              <span className="text-sm">No Sound</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center gap-4">
          <Button variant="outline" onClick={handleDeny} disabled={isInitializing}>
            No Thanks
          </Button>
          <Button onClick={handleAllow} disabled={isInitializing}>
            {isInitializing ? "Initializing..." : "Enable Adhan"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
