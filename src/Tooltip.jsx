import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Popup } from './Popup'
import useMapplicStore from './MapplicStore'
import classNames from 'classnames'

export const Tooltip = ({cond = true, location, hover = false, offset = 0, layer, containerSize}) => {
	const ref = useRef(null);

	const hoverAbout = useMapplicStore(state => state.data.settings.hoverAbout);
	const setOffset = useMapplicStore(state => state.setOffset);

	useEffect(() => {
		if (cond && !hover) setOffset({h: ref.current?.offsetHeight - offset});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [location.id]);
	
	if (!cond) return null;
	if (!location.id || !location.coord || location.disable || (location.layer && location.layer !== layer) || (hover && !location.title)) return null;
	if (!hover && location?.action === 'none') return null;

	return (
		<motion.div
			className={classNames('mapplic-tooltip mapplic-popup', {
				'mapplic-tooltip-mini': containerSize?.width < 400,
				'mapplic-tooltip-hover': hover
			})}
			data-location={location.id}
			data-group={location?.group}
			style={{
				maxWidth: `min(360px, ${containerSize?.width * 0.8}px)`,
				maxHeight: `min(240px, ${containerSize?.height * 0.8}px)`,
				top: `calc(${location.coord[1] * 100}% + ${offset - 16}px)`,
				left: (location.coord[0] * 100) + '%'
			}}
			initial={{ scale: 0.4, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			exit={{ scale: 0.4, opacity: 0 }}
			transition={{ duration: 0.2 }}
			onWheel={e => e.stopPropagation()}
			ref={ref}
		>
			{ !hover && location.action !== 'sidebar'
				? <Popup location={location} />
				: (
					<div className="mapplic-popup-content mapplic-popup-micro">
						<div className="mapplic-popup-title">
							<h4>{location.title}</h4>
							{ hoverAbout && <h5 dangerouslySetInnerHTML={{__html: location.about}}></h5> }
						</div>
					</div>
				)
			}
		</motion.div>
	)
}