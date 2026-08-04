import { useEffect, useState } from 'react'

// Windsurf school location — Pasohlávky, Nové Mlýny reservoir, Czechia.
export const LOCATION = { name: 'Pasohlávky', lat: 48.9047, lon: 16.5647 }

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'
const REFRESH_MS = 15 * 60 * 1000 // 15 min

// Water temp: no public API covers the Nové Mlýny reservoir. A Supabase edge
// function scrapes teplotavody.cz server-side and re-serves it with CORS.
const WATER_TEMP_URL =
  'https://esawmijmuirszthhxljf.supabase.co/functions/v1/water-temp'


/** WMO weather code -> { emoji, label }. */
export function weatherInfo(code) {
  const map = {
    0: ['☀️', 'Jasno'],
    1: ['🌤️', 'Skoro jasno'],
    2: ['⛅', 'Polojasno'],
    3: ['☁️', 'Zataženo'],
    45: ['🌫️', 'Mlha'],
    48: ['🌫️', 'Námraza'],
    51: ['🌦️', 'Slabé mrholení'],
    53: ['🌦️', 'Mrholení'],
    55: ['🌧️', 'Silné mrholení'],
    61: ['🌦️', 'Slabý déšť'],
    63: ['🌧️', 'Déšť'],
    65: ['🌧️', 'Silný déšť'],
    71: ['🌨️', 'Slabé sněžení'],
    73: ['🌨️', 'Sněžení'],
    75: ['❄️', 'Silné sněžení'],
    80: ['🌦️', 'Přeháňky'],
    81: ['🌧️', 'Přeháňky'],
    82: ['⛈️', 'Prudké přeháňky'],
    95: ['⛈️', 'Bouřka'],
    96: ['⛈️', 'Bouřka'],
    99: ['⛈️', 'Bouřka'],
  }
  const [emoji, label] = map[code] ?? ['🌡️', '—']
  return { emoji, label }
}

/* ---- Windy-style colour scales for the forecast table ---- */

/** Wind / gust speed (m/s) -> cell background. Text stays dark slate. */
export function windColor(ms) {
  if (ms == null) return '#ffffff'
  if (ms < 2) return '#ffffff'
  if (ms < 3) return '#dff9f5'
  if (ms < 4) return '#a6f0e4'
  if (ms < 5) return '#6fe9c8'
  if (ms < 6) return '#46e0a0'
  if (ms < 7) return '#4fe07a'
  if (ms < 8) return '#86eb4d'
  if (ms < 9) return '#b8f53d'
  if (ms < 11) return '#e6f53d'
  if (ms < 14) return '#f5c53d'
  return '#f58b3d'
}

/** Air temp (°C) -> cell background. Text white. */
export function tempColor(c) {
  if (c == null) return '#cbd5e1'
  if (c < 0) return '#6fa8dc'
  if (c < 10) return '#7fc6e8'
  if (c < 16) return '#9fe0a0'
  if (c < 20) return '#cfe86b'
  if (c < 23) return '#f2d24e'
  if (c < 26) return '#f5a54e'
  if (c < 29) return '#f0774e'
  if (c < 32) return '#eb4e6b'
  if (c < 35) return '#e5327e'
  return '#db1f86'
}

/** Timestamp (ms) -> { day: 'Mo 3.', hour: '12h' } in Europe/Prague. */
export function slotLabel(ts) {
  const d = new Date(ts)
  const opts = { timeZone: 'Europe/Prague' }
  const wd = d.toLocaleDateString('cs-CZ', { ...opts, weekday: 'short' }).slice(0, 2)
  const day = d.toLocaleDateString('cs-CZ', { ...opts, day: 'numeric' })
  const hour = d.toLocaleString('cs-CZ', { ...opts, hour: '2-digit', hour12: false }).slice(0, 2)
  return { day: `${wd} ${day}.`, hour: `${hour}h` }
}

const FORECAST_SLOTS = 8 // columns in the footer table
const FORECAST_STEP_H = 2 // hours between columns

function buildUrl() {
  const p = new URLSearchParams({
    latitude: LOCATION.lat,
    longitude: LOCATION.lon,
    current: 'temperature_2m,weather_code,wind_speed_10m',
    hourly:
      'temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m',
    wind_speed_unit: 'ms',
    timezone: 'Europe/Prague',
    timeformat: 'unixtime', // hourly.time as epoch seconds (UTC) -> tz-safe
    forecast_days: '2',
    models: 'ecmwf_ifs025',
  })
  return `${ENDPOINT}?${p}`
}

/**
 * Build the footer forecast: FORECAST_SLOTS columns spaced FORECAST_STEP_H hours,
 * starting at the current/next hour. Real Open-Meteo data (temp, wind, gust, dir).
 */
function buildForecastRows(hourly) {
  const times = hourly?.time
  if (!times?.length) return []
  const nowSec = Date.now() / 1000
  let start = times.findIndex((t) => t >= nowSec - 3600)
  if (start < 0) start = 0
  const rows = []
  for (let k = 0; k < FORECAST_SLOTS; k++) {
    const i = start + k * FORECAST_STEP_H
    if (i >= times.length) break
    rows.push({
      ts: times[i] * 1000,
      temp: Math.round(hourly.temperature_2m[i]),
      wind: Math.round(hourly.wind_speed_10m[i] * 10) / 10,
      gust: Math.round(hourly.wind_gusts_10m[i]),
      dir: Math.round(hourly.wind_direction_10m[i]),
      code: hourly.weather_code[i],
    })
  }
  return rows
}

/**
 * Live weather for the school.
 * Returns { loading, error, current: {temp, wind, code}, forecast: [{label,temp,wind,code}] }.
 * Water temperature is intentionally absent — no free API covers this inland reservoir.
 */
export function useWeather() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    current: null,
    waterTemp: null,
    windy: [], // footer forecast rows (Open-Meteo)
  })

  useEffect(() => {
    let alive = true

    const loadWeather = async () => {
      try {
        const res = await fetch(buildUrl())
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!alive) return
        setState((s) => ({
          ...s,
          loading: false,
          error: null,
          current: {
            temp: Math.round(data.current.temperature_2m),
            wind: Math.round(data.current.wind_speed_10m * 10) / 10,
            code: data.current.weather_code,
          },
          windy: buildForecastRows(data.hourly),
        }))
      } catch (err) {
        if (alive) setState((s) => ({ ...s, loading: false, error: err.message }))
      }
    }

    // Water temp fails independently — never blocks the rest of the header.
    const loadWater = async () => {
      try {
        const res = await fetch(WATER_TEMP_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (alive && typeof data.celsius === 'number')
          setState((s) => ({ ...s, waterTemp: Math.round(data.celsius) }))
      } catch {
        /* leave waterTemp null -> placeholder */
      }
    }

    loadWeather()
    loadWater()
    const id = setInterval(() => {
      loadWeather()
      loadWater()
    }, REFRESH_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  return state
}
