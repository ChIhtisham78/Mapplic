import { useEffect, useRef } from 'react'
import useMapplicStore from '../MapplicStore'
import { roundTo } from '../utils'
import { Editable } from './Editable'

export const Editor = ({source, setSource, prefix, parentScale, active = true}) => {
	const layer = useMapplicStore(state => state.layer);
	const selected = useMapplicStore(state => state.selectedVector);
	const setSelected = useMapplicStore(state => state.setSelectedVector);
	const getElement = useMapplicStore(state => state.getVectorById);
	const settings = useMapplicStore(state => state.data.settings);
	const dragging = useMapplicStore(state => state.dragging);

	const svgRef = useRef(null);
	const counter = useRef(source?.length + 1);
	
	const size = 12 / parentScale || 2;
	const elementRef = useRef(null);

	// save
	useEffect(() => {
		if (elementRef.current && !selected) {
			modifyElement(elementRef.current?.id, elementRef.current);
			elementRef.current = null;
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected]);
	
	// esc
	useEffect(() => {
		const keyDownHandler = (e) => {
			if (e.key === 'Escape') {
				e.preventDefault();
				setSelected(null);
			}
		};
		
		document.addEventListener('keydown', keyDownHandler);
		return () => { document.removeEventListener('keydown', keyDownHandler); };
	}, [setSelected]);
	
	// helpers
	const getCursorPos = (e) => {
		const parentRect = svgRef.current.getBoundingClientRect();
		return [
			roundTo((e.clientX - parentRect.left)/parentScale),
			roundTo((e.clientY - parentRect.top)/parentScale)
		]
	}

	const nextId = () => {
		const isUnique = (id) => source.some(el => el.id === id);
		let id = prefix + counter.current;
		
		while (isUnique(id)) {
			counter.current++;
			id = prefix + counter.current;
		}
	
		return id;
	}

	const handleClick = (e) => {
		if (!dragging && !selected) addNewElement(e);
	}

	const getPoints = () => source?.filter(el => el.layer === layer && el.id !== selected).map(el =>
		el.points.split(' ').map(point => [...point.split(',').map(Number), el.id])
	).flat();

	// CRUD
	const addNewElement = (e) => {
		const id = nextId();
		setSource([
			...source,
			{
				id: id,
				layer: layer,
				element: 'polyline',
				points: getCursorPos(e).join(',')
			}
		])
		setSelected(id);
	}

	const modifyElement = (id, mods) => {
		setSource(source.map(el => el.id === id ? { ...el, ...mods } : el ));
	}

	if (!source || !active) return null;
	return (
		<svg 
			viewBox={`0 0 ${settings.mapWidth} ${settings.mapHeight}`}
			style={{cursor: 'crosshair', pointerEvents: 'auto', position: 'absolute', top: 0, left: 0}}
			onClick={handleClick}
			ref={svgRef}
		>
			<g>
				{ getPoints().map((point, i) => 
					<circle
						style={{pointerEvents: 'auto', cursor: 'pointer'}}
						onClick={e => {
							e.stopPropagation();
							setSelected(point[2]); // 3rd item is path id
						}}
						key={i}
						cx={point[0]}
						cy={point[1]}
						r={roundTo(size, 2)}
						fill="#000"
						fillOpacity={0.1}
						strokeWidth={roundTo(size / 10*2)}
					/>
				)}
			</g>
			
			{ getElement(selected)?.layer === layer &&
				<Editable
					elementRef={elementRef}
					size={size}
					snapTo={getPoints()}
					element={getElement(selected)}
					getCursorPos={getCursorPos}
					modifyElement={modifyElement}
					parentScale={parentScale}
				/>
			}
		</svg>
	)
}