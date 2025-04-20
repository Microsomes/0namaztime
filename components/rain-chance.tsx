"use client"

import { Card, CardContent } from "@/components/ui/card"
import { WiRaindrop, WiUmbrella, WiSunset, WiTime4 } from "react-icons/wi"

interface RainChanceProps {
  rainChance: number;
  likelyRainTime: string;
}

export function RainChance({ rainChance, likelyRainTime }: RainChanceProps) {
  // Color based on rain chance
  const getColor = () => {
    if (rainChance < 20) return "text-green-500"
    if (rainChance < 50) return "text-yellow-500"
    return "text-red-500"
  }

  // Icon based on rain chance
  const getIcon = () => {
    if (rainChance < 20) {
      return <WiSunset className="h-12 w-12 text-amber-400" />
    } else if (rainChance < 50) {
      return <WiRaindrop className="h-12 w-12 text-blue-400" />
    } else {
      return <WiUmbrella className="h-12 w-12 text-blue-600" />
    }
  }

  // Message based on rain chance
  const getMessage = () => {
    if (rainChance < 20) {
      return "Low chance of rain"
    } else if (rainChance < 50) {
      return "Moderate chance of rain"
    } else {
      return "High chance of rain"
    }
  }

  // Add animations based on rain chance
  const iconClass = rainChance > 50 ? "animate-float" : "animate-pulse";
  
  return (
    <Card className="mb-4 animate-fade-in h-full" style={{animationDelay: "0.3s"}}>
      <CardContent className={`p-2 flex items-center justify-center ${rainChance > 50 ? "weather-rain" : ""}`}>
        <div className="flex flex-col items-center">
          <div className={iconClass}>
            {getIcon()}
          </div>
          <div className="text-center">
            <div className={`text-base font-medium ${getColor()} animate-fade-in`} style={{animationDelay: "0.4s"}}>
              {rainChance}%
            </div>
            <div className="text-xs text-muted-foreground animate-fade-in" style={{animationDelay: "0.5s"}}>
              {getMessage()}
            </div>
            {rainChance >= 30 && (
              <div className="flex items-center justify-center mt-1 text-2xs text-muted-foreground animate-fade-in" style={{animationDelay: "0.6s"}}>
                <WiTime4 className="h-3 w-3 mr-1" />
                {likelyRainTime}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}