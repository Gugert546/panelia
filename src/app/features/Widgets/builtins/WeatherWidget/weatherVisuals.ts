export type WeatherVisualMode = "clear" | "cloudy" | "rain" | "fog" | "snow";
export type WeatherCloudTone = "normal" | "rain" | "storm";

export function getWeatherVisualMode(symbolCode?: string): WeatherVisualMode {
  const code = symbolCode?.toLowerCase() ?? "";

  if (code.includes("fog")) return "fog";
  if (code.includes("snow") || code.includes("sleet")) return "snow";
  if (code.includes("rain")) return "rain";
  if (code.includes("cloudy")) return "cloudy";
  if (code.includes("clear") || code.includes("fair")) return "clear";

  return "cloudy";
}

export function getWeatherCloudTone(symbolCode?: string): WeatherCloudTone {
  const code = symbolCode?.toLowerCase() ?? "";

  if (code.includes("heavyrain") || code.includes("thunder")) return "storm";
  if (code.includes("rain")) return "rain";

  return "normal";
}
