import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, useMotionValue, useDragControls } from 'framer-motion'
import { Overlay } from './Overlay'
import { Layers } from './Layers'
import { roundTo } from './utils'
import useMapplicStore from './MapplicStore'

export const PanZoom = ({container, containerSize, aspectRatio}) => {
	const settings = useMapplicStore(state => state.data.settings);
	const pos = useMapplicStore(state => state.pos);
	const setPos = useMapplicStore(state => state.setPos);
	const target = useMapplicStore(state => state.target);
	const transition = useMapplicStore(state => state.transition);
	const setTransition = useMapplicStore(state => state.setTransition);
	const dragging = useMapplicStore(state => state.dragging);
	const setDragging = useMapplicStore(state => state.setDragging);
	const offset = useMapplicStore(state => state.offset);
	const setContainerMessage = useMapplicStore(state => state.setContainerMessage);

	const [pinch, setPinch] = useState(false);

	const ref = useRef();

	const dragControls = useDragControls();

	const [timeoutId, setTimeoutId] = useState(null);

	const [abs, setAbs] = useState({ scale: 1, x: 0, y: 0}); // absolute position

	const x = useMotionValue(0);
	const y = useMotionValue(0);
	const scale = useMotionValue(1);

	useEffect(() => { // container resized
		setRelPosition(pos.scale, pos.x, pos.y, {duration: 0});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [containerSize]);
	
	useEffect(() => { // location focused
		const focusY = 0.5 + offset.h/containerSize?.height/2;
		
		setRelPosition(target.scale, target.x, target.y, transition, focusY ? [0.5, focusY] : undefined);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [target, offset.h]);

	const fitScale = useMemo(() => ( // absolute fit scale
		roundTo(Math.min(containerSize?.height/settings.mapHeight, containerSize?.width/settings.mapWidth), 4)
	), [containerSize?.height, containerSize?.width, settings.mapHeight, settings.mapWidth]);

	const constrainScale = (scale = pos.scale) => roundTo(Math.min(Math.max(scale, 1), settings.maxZoom), 4); // constrain relative scale
	const constrains = (s = abs.scale) => {
		const paddingX = Math.max(s === fitScale ? 0 : containerSize?.width, (containerSize?.width - settings.mapWidth * s))/2;
		const paddingY = Math.max(s === fitScale ? 0 : containerSize?.height, (containerSize?.height - settings.mapHeight * s))/2;

		return {
			top: Math.round(containerSize?.height - settings.mapHeight * s - paddingY),
			bottom: Math.round(paddingY),
			left: Math.round(containerSize?.width - settings.mapWidth * s - paddingX),
			right: Math.round(paddingX)
		}
	}

	// convert absolute to relative
	const absToRel = (x = abs.x, y = abs.y, scale = abs.scale, focus = [0.5, 0.5]) => ({
		scale: scale / fitScale,
		x: (containerSize?.width * focus[0] - x) / (settings.mapWidth * scale),
		y: (containerSize?.height * focus[1] - y) / (settings.mapHeight * scale)
	})

	// convert relative to absolute
	const relToAbs = (x = pos.x, y = pos.y, scale = pos.scale, focus = [0.5, 0.5]) => ({
		scale: scale * fitScale,
		x: Math.round(containerSize?.width * focus[0] - x * settings.mapWidth * scale * fitScale),
		y: Math.round(containerSize?.height * focus[1] - y * settings.mapHeight * scale * fitScale)
	})

	// set relative position
	const setRelPosition = (newScale = pos.scale, newX = pos.x, newY = pos.y, t = {duration: 0.4}, focus = [0.5, 0.5]) => {
		const a = relToAbs(newX, newY, constrainScale(newScale), focus);
		const c = constrains(a.scale);

		const newAbs = {
			scale: a.scale,
			x: Math.max(Math.min(a.x, c.right), c.left),
			y: Math.max(Math.min(a.y, c.bottom), c.top)
		}

		if (!newAbs.scale) return;

		setTransition(t);
		setAbs(newAbs);
		setPos(absToRel(newAbs.x, newAbs.y, newAbs.scale, focus));
	}

	// mouse wheel
	const handleWheel = (e) => {
		const containerRect = container.current.getBoundingClientRect();
		const magnitude = 1.6;
		const newZoom = constrainScale(((e.deltaY + e.deltaX) < 0) ? pos.scale * magnitude : pos.scale / magnitude);
		if (settings.mouseWheelShift && !e.shiftKey) {
			setContainerMessage('mouseWheelShift');
			if (timeoutId) clearTimeout(timeoutId);
			setTimeoutId(
				setTimeout(() => {
					setContainerMessage(null);
				}, 1000)
			);
			return;
		}
		if (newZoom > settings.maxZoom) return;
		const focus = [
			(e.clientX - containerRect.x) / containerRect.width,
			(e.clientY - containerRect.y) / containerRect.height
		]
		const rel = absToRel(abs.x, abs.y, abs.scale, focus);
		setRelPosition(newZoom, rel.x, rel.y, {duration: settings.reduceMotion ? 0 : 0.4}, focus);
	}

	useEffect(() => {
		const element = ref.current;

		const hasParentWithClass = (element, className) =>
		!element || !element.parentElement
		  ? false
		  : element.parentElement.classList.contains(className) || hasParentWithClass(element.parentElement, className);

		const stopScroll = (e) => {
			if (settings?.mouseWheelShift && !e.shiftKey) return;
			if (!hasParentWithClass(e.target, 'mapplic-tooltip')) e.preventDefault();
		}

		if (element) {
			if (settings.mouseWheel !== false) element.addEventListener('wheel', stopScroll, { passive: false });
			else element.removeEventListener('wheel', stopScroll);

			return () => {
				element.removeEventListener('wheel', stopScroll);
			};
		}
	}, [ref, settings?.mouseWheel, settings?.mouseWheelShift]);

	const doubleClick = (e) => {
		if (e.detail === 2) {
			const containerRect = container.current.getBoundingClientRect();
			const focus = [
				(e.clientX - containerRect.x)/containerRect.width,
				(e.clientY - containerRect.y)/containerRect.height
			]

			const rel = absToRel(abs.x, abs.y, abs.scale, focus);
			setRelPosition(constrainScale(pos.scale * 2), rel.x, rel.y, {duration: 0.4}, focus);
		}
	}

	const updatePosState = () => {
		const newAbs = {
			...abs,
			x: x.get(),
			y: y.get()
		}
		setAbs(newAbs);
		setPos(absToRel(newAbs.x, newAbs.y, newAbs.scale));	
	}

	const transformTemplate = ({ scale }) => `matrix(${scale}, 0, 0, ${scale}, 0, 0)`;
	
	/* PINCH */
	const pinchPoint = (e) => {

		return {
			x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
			y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
			dist: Math.sqrt(Math.pow(e.touches[0].clientX - e.touches[1].clientX, 2), Math.pow(e.touches[0].clientY - e.touches[1].clientY, 2))
		}
	}

	const handleTouchStart = (e) => {
		if (e.touches.length > 1 && !pinch) {
			const p = pinchPoint(e);
			setPinch({
				x: p.x,
				y: p.y,
				dist: p.dist,
				scale: abs.scale
			});
		}
	}

	const handleTouchMove = (e) => {
		if (pinch) {
			const p = pinchPoint(e);
			const containerRect = container.current.getBoundingClientRect();
			const focus = [
				(pinch.x - containerRect.x) / containerRect.width,
				(pinch.y - containerRect.y) / containerRect.height
			]
			const rel = absToRel(abs.x, abs.y, abs.scale, focus);
			setRelPosition(constrainScale(pinch.scale / fitScale * p.dist/pinch.dist), rel.x, rel.y, {duration: 0}, focus);
		} 
	}

	const handleTouchEnd = (e) => {
		if (e.touches.length < 2) setPinch(false);
	}

	return (
		<motion.div className="mapplic-panzoom"
			drag={!pinch}
			dragControls={dragControls}
			dragListener={false}
			onWheel={settings?.mouseWheel === false ? undefined : handleWheel}
			onClick={doubleClick}
			ref={ref}

			onTouchStart={handleTouchStart}
			onTouchMove={handleTouchMove}
			onTouchEnd={handleTouchEnd}

			style={{x, y, cursor: dragging ? 'grabbing' : 'grab'}}
			animate={{ x: abs.x || 0, y: abs.y || 0 }}
			transition={transition}
			dragTransition={settings.reduceMotion ? { bounceStiffness: 0, bounceDamping: 0, timeConstant: 0, power: 0} : { bounceStiffness: 100, bounceDamping: 20, timeConstant: 100, power: 0.2}}
			dragElastic={settings.reduceMotion ? 0 : 0.3}
			dragConstraints={constrains()}
			onDragStart={() => setDragging(true)}
			onDragEnd={() => setTimeout(() => setDragging(false), 50)}
			onDragTransitionEnd={updatePosState}
		>
			<motion.div
				className="mapplic-layers"
				style={{scale, aspectRatio: aspectRatio}}
				transformTemplate={transformTemplate}
				animate={{scale: abs.scale || 1}}
				transition={transition}
				onPointerDown={e => dragControls.start(e)}
			>
				<Layers parentScale={abs.scale} />
			</motion.div>
			<Overlay width={settings.mapWidth * abs.scale} aspectRatio={aspectRatio} containerSize={containerSize} />
		</motion.div>
	)
}
