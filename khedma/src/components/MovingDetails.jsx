import { useTranslation } from 'react-i18next'

export default function MovingDetails({ vehicles }) {
  const { t } = useTranslation()
  return <fieldset className="moving-details">
    <legend className="h6">{t('flow.movingTitle')}</legend>
    {['pickup', 'dropoff', 'items'].map(key => <label key={key} htmlFor={`moving-${key}`}>{t(`flow.moving.${key}`)}
      <input id={`moving-${key}`} name={`moving_${key}`} required maxLength={255} className="form-control" />
    </label>)}
    <label htmlFor="moving-access">{t('flow.moving.access')}<input id="moving-access" name="moving_access" maxLength={255} className="form-control" /></label>
    <label htmlFor="moving-vehicle">{t('flow.moving.vehicle')}<select id="moving-vehicle" name="moving_vehicle" className="form-select" defaultValue="">
      <option value="">{t('flow.agreeWithWorker')}</option>{vehicles.map(key => <option value={key} key={key}>{t(`transportVehicles.${key}`)}</option>)}
    </select></label>
    <label htmlFor="moving-helpers">{t('flow.moving.helpers')}<select id="moving-helpers" name="moving_helpers" className="form-select" defaultValue="discuss">
      {['discuss', 'transport_only', 'one', 'team'].map(key => <option key={key} value={key}>{t(`flow.helpers.${key}`)}</option>)}
    </select></label>
  </fieldset>
}
