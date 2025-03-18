import { useState, useRef } from 'react'
import { Tooltip } from './Tooltip'
import { Marker } from './Marker'
import { motion, AnimatePresence } from 'framer-motion'
import { LocationDrag } from './controls/LocationDrag'
import { TooltipNewLocation } from './controls/TooltipNewLocation'
import useMapplicStore from './MapplicStore'

export const Overlay = ({width, aspectRatio, containerSize}) => {
	const settings = useMapplicStore(state => state.data.settings);
	const hovered = useMapplicStore(state => state.hovered);
	const transition = useMapplicStore(state => state.transition);
	const location = useMapplicStore(state => state.location);
	const layer = useMapplicStore(state => state.layer);
	const newLocation = useMapplicStore(state => state.newLocation);
	const estPos = useMapplicStore(state => state.estPos);
	const getLocationById = useMapplicStore(state => state.getLocationById);
	const getSampledLocation = useMapplicStore(state => state.getSampledLocation);
	const displayList = useMapplicStore(state => state.displayList);
	useMapplicStore(state => state.filters); // re-render
	useMapplicStore(state => state.search); // re-render

	const [offsets, setOffsets] = useState({});
	const [tempCoord, setTempCoord] = useState({});

	const ref = useRef(null);

	return (
		<motion.div className="mapplic-overlay" ref={ref} style={{aspectRatio: aspectRatio}} animate={{width: width || 0}} transition={transition}>
			<AnimatePresence>
				{ displayList()?.map(l => (!l.layer || (l.layer === layer)) &&
					<Marker
						key={l.id}
						location={getSampledLocation(l)}
						setOffsets={setOffsets}
					/>
				)}
				
				{ LocationDrag && location && <LocationDrag location={getLocationById()} layer={layer} dragConstraints={ref} setTempCoord={setTempCoord} /> }
				{ TooltipNewLocation && newLocation && <TooltipNewLocation key="new" location={{id: newLocation, ...estPos[newLocation]}} layer={layer} /> }

				<Tooltip
					key="focused"
					cond={location}
					location={{...getSampledLocation(), ...tempCoord}}
					offset={offsets[location]}
					containerSize={containerSize}
					layer={layer}
				/>

				<Tooltip
					key="hovered"
					cond={settings.hoverTooltip && hovered && hovered !== location}	
					hover={true}
					location={getSampledLocation(getLocationById(hovered))}
					offset={offsets[hovered]}
					layer={layer}
				/>

			</AnimatePresence>
		</motion.div>
	)
}