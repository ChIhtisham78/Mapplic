import { useState, useEffect, useRef } from 'react'
import { motion, useMotionValue } from 'framer-motion'
import useMapplicStore from '../MapplicStore'
import { roundTo } from '..//utils'

const COLOR = '#9747FF';
const DECIMAL = 2;

export const Editable = ({size, element, elementRef, modifyElement, getCursorPos, snapTo, parentScale}) => {
	const settings = useMapplicStore(state => state.data.settings);
	const dragging = useMapplicStore(state => state.dragging);

	const tempCounter = useRef(0);
	const getTempCounter = () => {
		tempCounter.current++;
		return tempCounter.current;
	}

	const [editing, setEditing] = useState(false);
	const [points, setPoints] = useState(element?.points?.split(' ').map(p => p.split(',').map(Number)).map(p => {
		return {
			id: getTempCounter(),
			x: p[0],
			y: p[1]
		}
	}));

	useEffect(() => {
		elementRef.current = {
			...element,
			points: points?.map(p => `${p.x},${p.y}`).join(' ')
		}
	}, [element, elementRef, points]);

	const rounded = (pos) => {
		if (Array.isArray(pos)) return {
			x: roundTo(pos[0], DECIMAL),
			y: roundTo(pos[1], DECIMAL)
		}
		else return {
			x: roundTo(pos.x, DECIMAL),
			y: roundTo(pos.y, DECIMAL)
		}
	}

	const snapped = (pos) => {
		const snap = size;
		let closest = null;
		let min = snap;
	
		for (const p of snapTo) {
			const point = { x: p[0], y: p[1] };
			const distance = Math.sqrt((pos.x - point.x) ** 2 + (pos.y - point.y) ** 2);
		
			if (distance <= snap && distance < min) {
				closest = point;
				min = distance;
			}
		}
		return closest || pos;
	}

	// CRUD
	const addPoint = (pos, position = points.length) => {
		setPoints(prev =>[
			...prev.slice(0, position),
			{
				id: getTempCounter(),
				...snapped(rounded(pos))
				//x: roundTo(pos[0], DECIMAL),
				//y: roundTo(pos[1], DECIMAL)
			},
			...prev.slice(position)
		])
	}

	const modifyPoint = (point) => {
		const found = points.find(p => p.id === point.id);
		const pos = snapped(rounded(point));
		
		if (!found || (pos.x === found.x && pos.y === found.y)) return false;
		setPoints(prev => prev.map(p => {
			if (p.id === point.id) return {
				...point,
				...pos
			}
			else return p;
		}));
	}

	const deletePoint = (id) => {
		setPoints(prev => prev.filter(p => p.id !== id));
	}

	const handleClick = (e) => {
		e.stopPropagation();
		if (element?.element === 'polyline' && !dragging) addPoint(getCursorPos(e));
	}

	const toggleType = () => {
		modifyElement(element.id, {
			element: elementRef.current.element === 'polygon' ? 'polyline' : 'polygon'
		});
	}

	if (!points) return null;
	return (
		<g style={{pointerEvents: 'auto'}}>
			<rect onClick={handleClick} style={{pointerEvents: 'auto'}} x="0" y="0" width={settings.mapWidth} height={settings.mapHeight} fill="green" opacity="0" />
			{ points?.map((p, i) => i > 0 ? 
				<Line
					i={i}
					key={p.id}
					size={size}
					editing={editing}
					p1={points[i-1]}
					p2={p}
					getCursorPos={getCursorPos}
					addPoint={addPoint}
				/>
				: null
			)}

			{ element.element === 'polygon' && 
				<Line
					size={size}
					editing={editing}
					p1={points[0]}
					p2={points[points.length-1]}
					getCursorPos={getCursorPos}
					addPoint={addPoint}
				/>
			}

			{ points?.map((p, i) => 
				<Anchor
					key={p.id}
					i={i}
					point={p}
					getCursorPos={getCursorPos}
					modifyPoint={modifyPoint}
					deletePoint={deletePoint}
					toggleType={toggleType}
					setEditing={setEditing}
					size={size}
					parentScale={parentScale}
				/>
			)}
		</g>
	)
}

const perpendicularIntersection = (p, l1, l2) => {
	const dx = l2.x - l1.x;
	const dy = l2.y - l1.y;
  
	if (dx === 0) return { x: l1.x, y: p.y }
  
	const m = dy / dx;
	const m_perpendicular = -1 / m;
  
	const x_cross = (m * l1.x - m_perpendicular * p.x + p.y - l1.y) / (m - m_perpendicular);
	const y_cross = m_perpendicular * (x_cross - p.x) + p.y;
  
	return { x: x_cross, y: y_cross };
}

const Line = ({i, p1, p2, size, getCursorPos, addPoint, editing}) => {
	//const between
	const [between, setBetween] = useState(null);

	const handleHover = (e) => {
		if (!getCursorPos) return;
		const cursor = getCursorPos(e);
		setBetween(perpendicularIntersection({x: cursor[0], y: cursor[1]}, p1, p2));
	}

	const handleMouseDown = (e) => {
		e.stopPropagation();
		addPoint([between.x, between.y], i);
		setBetween(null);
	}

	return (
		<g
			onMouseMove={handleHover}
			onMouseLeave={() => setBetween(null)}
			onMouseDown={handleMouseDown}
		>
			<line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={COLOR} strokeWidth={size/10} />
			<line style={{cursor: 'pointer', pointerEvents: 'auto'}} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={COLOR} strokeOpacity={0.1} strokeWidth={size/10*6} />
			
			{ (between && !editing) && <Anchor point={between} size={size} />}
		</g>
	)
}

const Anchor = ({i, point, modifyPoint, deletePoint, toggleType, size, parentScale, setEditing}) => {
	const x = useMotionValue(0);
	const y = useMotionValue(0);

	const [initial, setInitial] = useState(null);

	return (
		<motion.circle
			drag
			dragMomentum={false}
			//whileTap={{ scale: 0.8 }}
			onDragStart={() => {
				setInitial(point);
				if (setEditing) setEditing(true);
			}}
			onDrag={(e, info) => { // optimize
				if (initial && modifyPoint) {
					modifyPoint({
						...point,
						x: initial.x + info.offset.x / parentScale,
						y: initial.y + info.offset.y / parentScale
					})
					x.set(0);
					y.set(0);
				}
			}}
			onDragEnd={(e, i) => {
				if (!modifyPoint) return;
				const newPos = [
					x.get(),
					y.get()
				]
				modifyPoint({
					...point,
					x: point.x + newPos[0], // or i.offset.x / parentScale
					y: point.y + newPos[1]
				})
				x.set(0);
				y.set(0);
				setInitial(null);
				if (setEditing) setEditing(false);
			}}
			onClick={(e) => {
				e.stopPropagation();
				if (e.detail === 2 && deletePoint && initial === null) deletePoint(point.id);
				else {
					if (i === 0 && initial === null) toggleType();
				}
			}}
			cx={point.x}
			cy={point.y}
			r={size/2}
			style={{x, y, outline: 'none', pointerEvents: 'auto', cursor: 'pointer'}}
			stroke={COLOR}
			fill={i === 0 ? COLOR : 'white' }
			strokeWidth={size / 10*2}
		/>
	)
}