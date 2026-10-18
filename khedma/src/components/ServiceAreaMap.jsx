import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePreferences } from '../preferences/usePreferences'
import { resolveCity } from '../search/matching'

const centres = {
  Casablanca: [33.5731, -7.5898], Rabat: [34.0209, -6.8416], Salé: [34.0531, -6.7985],
  Fès: [34.0331, -5.0003], Oujda: [34.6814, -1.9086], Marrakech: [31.6295, -7.9811],
  Tangier: [35.7595, -5.834], Agadir: [30.4278, -9.5981], Meknès: [33.8935, -5.5473],
  Tétouan: [35.5889, -5.3626], Kenitra: [34.261, -6.5802],
}
const width = 600, height = 320
function project(lat, lng, zoom) {
  const size = 256 * 2 ** zoom
  const sin = Math.sin(lat * Math.PI / 180)
  return [(lng + 180) / 360 * size, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size]
}

export default function ServiceAreaMap(props) {
  return <MapPreview key={resolveCity(props.city).label} {...props} />
}

function useSmoothRadius(target) {
  const { preferences } = usePreferences()
  const [value, setValue] = useState(target)
  const current = useRef(target)
  useEffect(() => {
    const start = current.current
    let frame
    let began
    const reduced = preferences.reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    function animate(time) {
      if (began === undefined) began = time
      const progress = reduced ? 1 : Math.min(1, (time - began) / 280)
      const eased = 1 - (1 - progress) ** 3
      current.current = start + (target - start) * eased
      setValue(current.current)
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [target, preferences.reduceMotion])
  return value
}

function MapPreview({ city, radius, centre, onCentreChange }) {
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const zoom = 12
  const cityName = resolveCity(city).label
  const selectedPoint = centre || centres[cityName]
  const [point, setPoint] = useState(() => selectedPoint || centres.Casablanca)
  const validRadius = Number(radius) >= 0.5 && Number(radius) <= 500
  const projected = point ? project(...point, zoom) : [0, 0]
  const left = projected[0] - width / 2, top = projected[1] - height / 2
  const metresPerPixel = point ? 156543.03392 * Math.cos(point[0] * Math.PI / 180) / 2 ** zoom : 1
  const pixels = useSmoothRadius(validRadius ? Number(radius) * 1000 / metresPerPixel : 0)
  const marker = selectedPoint ? project(...selectedPoint, zoom) : projected
  const markerX = marker[0] - left, markerY = marker[1] - top
  const tiles = []
  if (point) {
    for (let x = Math.floor(left / 256); x <= Math.floor((left + width) / 256); x++) {
      for (let y = Math.floor(top / 256); y <= Math.floor((top + height) / 256); y++) {
        if (y >= 0 && y < 2 ** zoom) tiles.push({ x, y, wrappedX: ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom })
      }
    }
  }
  function choosePoint(x, y) {
    const size = 256 * 2 ** zoom
    onCentreChange([Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI, x / size * 360 - 180])
  }
  function movePoint(event) {
    if (!onCentreChange) return
    const offsets = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16], Enter: [0, 0], ' ': [0, 0] }
    const offset = offsets[event.key]
    if (!offset) return
    event.preventDefault()
    choosePoint(Math.min(left + width, Math.max(left, marker[0] + offset[0])), Math.min(top + height, Math.max(top, marker[1] + offset[1])))
  }
  function selectPoint(event) {
    if (!onCentreChange) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = left + (event.clientX - bounds.left) / bounds.width * width
    const y = top + (event.clientY - bounds.top) / bounds.height * height
    choosePoint(x, y)
  }
  function locate() {
    setError('')
    if (!navigator.geolocation) { setError(t('register.locationError')); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      const location = [position.coords.latitude, position.coords.longitude]
      setPoint(location); onCentreChange(location); setLocating(false)
    }, () => { setError(t('register.locationError')); setLocating(false) }, { timeout: 10000 })
  }
  return <div className="service-area-preview">
    <>
      <div className="service-area-map">
        <svg viewBox={`0 0 ${width} ${height}`} onClick={selectPoint} onKeyDown={movePoint} tabIndex={onCentreChange ? 0 : undefined} role={onCentreChange ? "button" : "img"} aria-label={t('register.mapTitle')}>
          <title>{t('register.mapTitle')}</title>
          {tiles.map(tile => <image key={`${zoom}-${tile.x}-${tile.y}`} href={`https://tile.openstreetmap.org/${zoom}/${tile.wrappedX}/${tile.y}.png`} x={tile.x * 256 - left} y={tile.y * 256 - top} width="256" height="256" />)}
          {selectedPoint && validRadius && <>
          <circle cx={markerX} cy={markerY} r={pixels} className="service-area-circle" fill="#526c49" fillOpacity="0.12" stroke="#365c36" strokeWidth="3" />
          <circle cx={markerX} cy={markerY} r="5" fill="#365c36" stroke="white" strokeWidth="2" />
          <line x1={markerX} y1={markerY} x2={markerX + pixels} y2={markerY} stroke="#365c36" strokeWidth="2" />
          <text x={Math.max(45, Math.min(width - 45, markerX + pixels / 2))} y={markerY - 10} textAnchor="middle" fill="#163416" stroke="white" strokeWidth="4" paintOrder="stroke" fontSize="18">{radius} km</text>
          </>}
        </svg>
        <a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </div>
      {selectedPoint && validRadius && <p className="small-muted mt-2 mb-2" aria-live="polite">{t('register.radiusHint', { radius, diameter: Number(radius) * 2 })}</p>}
      {!selectedPoint && <p className="small-muted mt-2">{t('register.mapCity')}</p>}
    </>
    {onCentreChange && <><p className="small-muted mb-2">{t('register.mapHelp')}</p><button type="button" disabled={locating} className="btn btn-outline-primary btn-sm" onClick={locate}>{t(locating ? 'common.loading' : 'register.useLocation')}</button></>}
    {error && <p role="alert" className="text-danger mt-2">{error}</p>}
    {onCentreChange && centre && <><input type="hidden" name="latitude" value={centre[0]} /><input type="hidden" name="longitude" value={centre[1]} /></>}
  </div>
}
