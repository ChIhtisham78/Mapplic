import { useState, useEffect } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import useMapplicStore from '../MapplicStore'

export const LocationDrag = ({location, layer, dragConstraints, setTempCoord}) => {
	const [initCoord, setInitCoord] = useState(location?.coord);
	const [dragging, setDragging] = useState(false);

	const loc = useMapplicStore(state => state.location);
	const locations = useMapplicStore(state => state.data.locations);
	const setData = useMapplicStore(state => state.setData);

	const x = useMotionValue(0);
	const y = useMotionValue(0);
	
	useEffect(() => {
		setInitCoord(location?.coord);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [loc]);
	
	if (!initCoord || (location?.layer && location?.layer !== layer)) return;
	
	const updateLocationProperty = (id, property, value) => {
		setData({
			locations: locations.map(l => (l.id === id) ? { ...l, [property]: value } : l)
		})
	}

	const dragProgress = (offset) => {
		const newCoord = [
			Math.round((initCoord[0] + offset.x / dragConstraints.current.offsetWidth) * 10000)/10000,
			Math.round((initCoord[1] + offset.y / dragConstraints.current.offsetHeight) * 10000)/10000
		]
		setTempCoord({coord: newCoord, latlng: null});	
	}

	const applyDrag = (offset) => {
		const newCoord = [
			Math.round((initCoord[0] + offset.x / dragConstraints.current.offsetWidth) * 10000)/10000,
			Math.round((initCoord[1] + offset.y / dragConstraints.current.offsetHeight) * 10000)/10000
		]
		updateLocationProperty(location?.id, 'coord', newCoord);
		setInitCoord(newCoord);
		setTempCoord({});
	}

	const resetDrag = () => {
		x.set(0);
		y.set(0);
	}

	if (!location.id) return null;

	return (
		<motion.div
			className="mapplic-location-drag"
			style={{
				x,
				y,
				top: (initCoord[1] * 100) + '%',
				left: (initCoord[0] * 100) + '%',
				cursor: dragging ? 'grabbing' : 'grab'
			}}
			drag
			onTapStart={(e) => setDragging(true)}
			onDrag={(e, i) => {
				dragProgress(i.offset);
			}}
			onDragEnd={(e, i) => {
				setDragging(false);
				applyDrag(i.offset);
			}}
			onTap={resetDrag}
			onTapCancel={resetDrag}
			dragConstraints={dragConstraints}
			dragMomentum={false}
		></motion.div>
	)
}