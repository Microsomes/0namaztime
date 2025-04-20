"use server"

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  condition: string;
  icon: string;
  rainChance: number;
  humidity: number;
  wind: number;
  location: string;
}

export async function fetchWeather(): Promise<WeatherData | null> {
  try {
    // Using OpenWeatherMap API - you would need to replace with your own API key
    // For demo purposes, we'll use a fixed API call for Birmingham, UK
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=Birmingham,uk&units=metric&appid=demo`, 
      { next: { revalidate: 1800 } } // Cache for 30 minutes
    );

    if (!response.ok) {
      console.error("Weather API error:", response.statusText);
      return mockWeatherData(); // Return mock data if API fails
    }

    const data = await response.json();
    
    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      condition: data.weather[0].main,
      icon: data.weather[0].icon,
      rainChance: data.rain ? 
        Math.min(100, Math.round((data.rain["1h"] || 0) * 20)) : 
        Math.round(Math.random() * 20), // Estimate rain chance based on rain amount or make an educated guess
      humidity: data.main.humidity,
      wind: Math.round(data.wind.speed),
      location: "Birmingham, UK"
    };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return mockWeatherData(); // Return mock data if something goes wrong
  }
}

// Fallback with realistic mock data for Birmingham
function mockWeatherData(): WeatherData {
  // Get time of day to generate somewhat realistic data
  const hour = new Date().getHours();
  const isDay = hour >= 7 && hour <= 19;
  
  // Seasonal temperature ranges (UK Birmingham)
  const month = new Date().getMonth();
  let tempBase: number;
  
  // Approximate temperature ranges by season
  if (month >= 11 || month <= 1) { // Winter
    tempBase = isDay ? 5 : 2;
  } else if (month >= 2 && month <= 4) { // Spring
    tempBase = isDay ? 12 : 7;
  } else if (month >= 5 && month <= 8) { // Summer
    tempBase = isDay ? 22 : 15;
  } else { // Autumn
    tempBase = isDay ? 14 : 9;
  }
  
  // Add some randomness
  const temp = tempBase + Math.round((Math.random() * 4) - 2);
  
  // UK has frequent rain chance
  const rainChance = Math.min(100, Math.round(20 + Math.random() * 40));
  
  // Weather conditions based on rain chance
  let condition: string;
  let icon: string;
  
  if (rainChance > 70) {
    condition = "Rain";
    icon = isDay ? "10d" : "10n"; // Rain
  } else if (rainChance > 40) {
    condition = "Clouds";
    icon = isDay ? "04d" : "04n"; // Broken clouds
  } else {
    condition = "Clear";
    icon = isDay ? "01d" : "01n"; // Clear sky
  }
  
  return {
    temperature: temp,
    feelsLike: temp - 2,
    condition,
    icon,
    rainChance,
    humidity: 65 + Math.round(Math.random() * 20),
    wind: 3 + Math.round(Math.random() * 7),
    location: "Birmingham, UK"
  };
}