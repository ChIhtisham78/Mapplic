import React, { useState, Suspense } from 'react'
import { X, ArrowUpRight , Phone, Mail, Clock } from 'react-feather'
import useMapplicStore from './MapplicStore'
import classNames from 'classnames'

const NavigateButton = import.meta.env.VITE_PRO === 'true' ? React.lazy(() => import('./extensions/wayfinding/NavigateButton')) : null;

export const Popup = ({location}) => {
	const closeLocation = useMapplicStore(state => state.closeLocation);
	const settings = useMapplicStore(state => state.data.settings);

	const [details, setDetails] = useState(false);

	return (
		<>
			{ location.image && (
				<div className="mapplic-popup-image">
					<img src={location.image} alt={location?.title} key={location.image} />
				</div>
			)}
			<div className="mapplic-popup-content">
				<button type="button" className="mapplic-popup-close" onClick={() => closeLocation()}><X size={12}/></button>
				<div className="mapplic-popup-title">
					{ location.title && <h4>{location.title}</h4> }
					{ location.about && <h5 dangerouslySetInnerHTML={{__html: location.about}}></h5> }
				</div>

				{ location?.desc && <div className="mapplic-popup-body" dangerouslySetInnerHTML={{__html: location.desc}}></div> }

				<Details location={location} field={details} />

				{ (location?.link || location?.hours || location?.phone || location?.email || settings.wayfinding) && (
					<div className="mapplic-popup-footer">
						<div className="mapplic-popup-actions">
							{ import.meta.env.VITE_PRO && settings.wayfinding && <Suspense fallback={null}><NavigateButton id={location.id} /></Suspense> }
							<DetailButton location={location} field="phone" details={details} setDetails={setDetails}><Phone size={16} /></DetailButton>
							<DetailButton location={location} field="email" details={details} setDetails={setDetails}><Mail size={16} /></DetailButton>
							<DetailButton location={location} field="hours" details={details} setDetails={setDetails}><Clock size={16} /></DetailButton>
						</div>

						{ location.link &&
							<a href={location.link} target={location.target || '_blank'} className="mapplic-popup-link mapplic-button mapplic-button-primary" rel="noreferrer">
								<span>{ location.more || settings.moreText || 'More' }</span>
								<ArrowUpRight size={16}/>
							</a>
						}
					</div>
				)}
			</div>
		</>
	)
}

const Details = ({location, field, ...props}) => {

	if (!location[field]) return null;
	return (
		<div className="mapplic-popup-details">
			{ field === 'phone' && <FragmentedLinks content={location.phone} prefix="tel:" {...props}/> }
			{ field === 'email' && <FragmentedLinks content={location.email} prefix="mailto:" {...props}/> }
			{ field === 'hours' && <div className="mapplic-hours">{ location?.hours?.split(';').map((line, i) => <div key={i}>{line}</div>) }</div> }
		</div>
	)
}

const FragmentedLinks = ({content, prefix = '', ...props}) => (
	content?.split(',').map(link => <a key={link} href={`${prefix}${link.trim()}`} {...props}>{link.trim()}</a>)
)

const DetailButton = ({location, field, details, setDetails, children}) => {
	if (!location[field]) return null;

	return (
		<button
			className={classNames('mapplic-button mapplic-button-icon', {'mapplic-active': details === field})}
			onClick={() => setDetails(prev => prev === field ? false : field )}
		>
			{ children }
		</button>
	)
}