import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import classNames from 'classnames'
import useMapplicStore from './MapplicStore'

export const Marker = ({location, active, setOffsets}) => {
	const hovered = useMapplicStore(state => state.hovered);
	const setHovered = useMapplicStore(state => state.setHovered);
	const openLocation = useMapplicStore(state => state.openLocation);
	const loc = useMapplicStore(state => state.location);
	const dragging = useMapplicStore(state => state.dragging);

	const ref = useRef(null);
	const scale = parseFloat(location.scale) || 1;

	useEffect(() => {
		if (!ref.current) return;
		setOffsets(prev => {
			return {
				...prev,
				[location.id]: parseFloat(window.getComputedStyle(ref.current).getPropertyValue('margin-top')) * scale
			}
		});
	}, [location.id, location.type, scale, setOffsets]);

	if (location.disable || !location.coord ||  location.type === 'hidden') return;

	return (
		<motion.a
			ref={ref}
			whileTap={{ scale: scale }}
			whileHover={{ scale: scale * 1.2 }}
			whileDrag={{ scale: scale * 1.2 }}
			initial={{ scale: scale * 0.4, opacity: 0 }}
			animate={{ scale: scale, opacity: 1 }}
			exit={{ scale: scale * 0.4, opacity: 0 }}
			transition={{ type: 'spring', duration: 0.4 }}

			onMouseEnter={() => setHovered(location.id) }
			onMouseLeave={() => setHovered(false) }

			className={classNames('mapplic-marker', {
				'mapplic-highlight': hovered === location.id,
				'mapplic-active': loc === location.id,
				[location.type]: location.type,
				[location.style]: location.style
			})}
			style={{
				top: (location?.coord[1] * 100) + '%',
				left: (location?.coord[0] * 100) + '%',
				backgroundColor: location.color,
				zIndex: active ? 101 : 'auto'
			}}
			onClick={() => {
				if (!dragging) openLocation(location.id);
			}}
		>
			<Pin type={location.type} color={location.color} thumb={location.thumb}/>
			<span>{ location.label }</span>
			{ location?.type === 'pulse' &&
				<div className="mapplic-marker-pulse"></div>
			}
			{ location?.type === 'text' && location?.title && <span className="title" style={{
				color: location?.color || 'black',
				textShadow: '0 0 4px #fff'
			}}>{location.title}</span>}
		</motion.a>
	)
}

const Pin = ({type, color, thumb}) => {
	switch (type) {
		case 'pin1':
			return (
				<svg width="22px" height="26px" viewBox="0 0 22 26" xmlns="http://www.w3.org/2000/svg">
					<path fill={color} d="M22,11c0-6.1-4.9-11-11-11S0,4.9,0,11c0,5,3.4,9.3,8,10.6l3,4.4l3-4.4C18.6,20.3,22,16,22,11z"/>
				</svg>
			)
		case 'pin2':
			return (
				<svg width="21px" height="28px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 28">
					<path fill={color} d="M10.5,0C4.71,0,0,4.71,0,10.5c0,7.75,9.69,16.95,10.1,17.34c0.11,0.11,0.26,0.16,0.4,0.16s0.29-0.05,0.4-0.16C11.31,27.45,21,18.25,21,10.5C21,4.71,16.29,0,10.5,0z"/>
					<circle fill="rgba(0, 0, 0, 0.3)" cx="10.5" cy="10.5" r="8"/>
				</svg>
			)
		case 'thumb':
			return <img src={thumb} alt="marker" />
		default:
			return;
	}
}