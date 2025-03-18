import { useRef } from 'react'
import useMapplicStore from './MapplicStore'

export const Vectors = ({source, parentScale, active = true}) => {
	const admin = useMapplicStore(state => state.admin);
	const settings = useMapplicStore(state => state.data.settings);
	const selected = useMapplicStore(state => state.selectedVector);
	const setSelected = useMapplicStore(state => state.setSelectedVector);
	const layer = useMapplicStore(state => state.layer);

	const svgRef = useRef(null);

	const size = 12 / parentScale || 2;

	if (!active) return null;
	return (
		<svg 
			viewBox={`0 0 ${settings.mapWidth} ${settings.mapHeight}`}
			style={{cursor: 'crosshair', pointerEvents: 'none', position: 'absolute', top: 0, left: 0}}
			ref={svgRef}
		>
			{ source?.filter(el => el.layer === layer && el.id !== selected).map(el => 
				<el.element
					key={el.id}
					points={el.points}
					onClick={(e) => {
						if (!selected && admin) {
							if (e) e.stopPropagation();
							setSelected(el.id);
						}
					}}
					style={{pointerEvents: !selected ? 'auto' : 'none', cursor: 'pointer'}}
					stroke={el.endpoint ? 'green' : 'red' }
					strokeWidth={size/10}
					strokeLinejoin="round"
					strokeDasharray={el.inaccessible ? size/5 : 'none'}
					fill={el.element !== 'polygon' ? 'none' : 'black'} // or none?
					fillOpacity="0.2" 
				/>)
			}
		</svg>
	)
}