"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { WeatherData } from "@/app/actions/fetch-weather"
import { 
  WiDaySunny, WiNightClear, WiDayCloudy, WiNightAltCloudy, 
  WiCloudy, WiRain, WiDayRain, WiNightRain, WiSnow, WiThunderstorm,
  WiHumidity, WiStrongWind, WiRaindrop, WiThermometer
} from "react-icons/wi"

interface WeatherCardProps {
  weatherData: WeatherData
}

export function WeatherCard({ weatherData }: WeatherCardProps) {
  // Function to get icon based on OpenWeatherMap icon code and condition
  const getWeatherIcon = (iconCode: string, condition: string) => {
    const isDay = iconCode.includes('d')
    
    switch (condition.toLowerCase()) {
      case 'clear':
        return isDay ? <WiDaySunny className="h-10 w-10 text-amber-400" /> : <WiNightClear className="h-10 w-10 text-blue-300" />
      case 'clouds':
        if (iconCode === '02d' || iconCode === '02n') {
          return isDay ? <WiDayCloudy className="h-10 w-10 text-gray-500" /> : <WiNightAltCloudy className="h-10 w-10 text-gray-400" />
        }
        return <WiCloudy className="h-10 w-10 text-gray-500" />
      case 'rain':
      case 'drizzle':
        return isDay ? <WiDayRain className="h-10 w-10 text-blue-400" /> : <WiNightRain className="h-10 w-10 text-blue-300" />
      case 'thunderstorm':
        return <WiThunderstorm className="h-10 w-10 text-indigo-500" />
      case 'snow':
        return <WiSnow className="h-10 w-10 text-blue-100" />
      default:
        return isDay ? <WiDaySunny className="h-10 w-10 text-amber-400" /> : <WiNightClear className="h-10 w-10 text-blue-300" />
    }
  }

  // Color for rain chance indicator
  const getRainChanceColor = (chance: number) => {
    if (chance < 30) return 'text-green-500'
    if (chance < 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  // Add weather-specific animation class based on condition
  const cardClass = weatherData.condition.toLowerCase().includes('rain') ? 
    "weather-rain mb-4 overflow-hidden animate-fade-in" : 
    "mb-4 overflow-hidden animate-fade-in";
    
  return (
    <Card className={cardClass}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="animate-float">
              {getWeatherIcon(weatherData.icon, weatherData.condition)}
            </div>
            <div className="ml-3">
              <div className="text-sm text-muted-foreground">{weatherData.location}</div>
              <div className="flex items-center animate-fade-in" style={{animationDelay: "0.2s"}}>
                <WiThermometer className="h-6 w-6" />
                <span className="text-2xl font-bold">{weatherData.temperature}°C</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 animate-fade-in" style={{animationDelay: "0.3s"}}>
                Feels like {weatherData.feelsLike}°C
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center mb-2 animate-fade-in" style={{animationDelay: "0.2s"}}>
              <WiRaindrop className={`h-6 w-6 ${getRainChanceColor(weatherData.rainChance)} animate-pulse`} />
              <span className={`text-sm ml-1 ${getRainChanceColor(weatherData.rainChance)}`}>
                {weatherData.rainChance}% chance
              </span>
            </div>
            <div className="flex items-center mb-2 animate-fade-in" style={{animationDelay: "0.3s"}}>
              <WiHumidity className="h-6 w-6 text-blue-400" />
              <span className="text-sm ml-1">{weatherData.humidity}% humidity</span>
            </div>
            <div className="flex items-center animate-fade-in" style={{animationDelay: "0.4s"}}>
              <WiStrongWind className="h-6 w-6 text-gray-400 animate-pulse" />
              <span className="text-sm ml-1">{weatherData.wind} m/s</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}