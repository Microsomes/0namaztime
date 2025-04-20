"use client"

import { Card, CardContent } from "@/components/ui/card"
import { WiRaindrop, WiUmbrella, WiSunset } from "react-icons/wi"

interface RainChanceProps {
  rainChance: number
}

export function RainChance({ rainChance }: RainChanceProps) {
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
    <Card className="mb-4 animate-fade-in" style={{animationDelay: "0.3s"}}>
      <CardContent className={`p-4 flex items-center justify-between ${rainChance > 50 ? "weather-rain" : ""}`}>
        <div className="flex items-center">
          <div className={iconClass}>
            {getIcon()}
          </div>
          <div className="ml-3">
            <div className={`text-lg font-medium ${getColor()} animate-fade-in`} style={{animationDelay: "0.4s"}}>
              {rainChance}% Chance of Rain
            </div>
            <div className="text-sm text-muted-foreground animate-fade-in" style={{animationDelay: "0.5s"}}>
              {getMessage()}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}