import { useTranslation } from 'react-i18next'
const transportVehicles = ['triporteur', 'bus', 'bike', 'motorcycle', 'car', 'van', 'truck']
export default function TransportOptions({ value, onChange }) {
  const { t } = useTranslation()
  return <fieldset><legend className="h6">{t('register.transport')}</legend>
    <p className="small-muted">{t('register.transportHelp')}</p>
    <div className="checkbox-list">{transportVehicles.map(vehicle => <label key={vehicle} className="checkbox-chip">
      <input type="checkbox" checked={value.includes(vehicle)} onChange={() => onChange(value.includes(vehicle) ? value.filter(item => item !== vehicle) : [...value, vehicle])} />
      {t(`transportVehicles.${vehicle}`)}
    </label>)}</div>
  </fieldset>
}
