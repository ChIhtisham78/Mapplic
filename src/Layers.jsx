import React, { useRef, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { roundTo, fileExtension } from './utils'
import { Vectors } from './Vectors'
import { Editor } from './controls/Editor'
import SVG from 'react-inlinesvg'
import useMapplicStore from './MapplicStore'

const AnimatedRoute = import.meta.env.VITE_PRO ? React.lazy(() => import('./extensions/wayfinding/AnimatedRoute')) : null;

export const Layers = ({parentScale}) => {
	const data = useMapplicStore(state => state.data);
	const setData = useMapplicStore(state => state.setData);
	const settings = useMapplicStore(state => state.data.settings);
	const layer = useMapplicStore(state => state.layer);
	const layers = useMapplicStore(state => state.data.layers);
	const setLatLonCache = useMapplicStore(state => state.setLatLonCache);
	const routesEditing = useMapplicStore(state => state.routesEditing);
	useMapplicStore(state => state.layer); // re-render
	
	useEffect(() => {
		setLatLonCache();
	}, [settings?.geo, settings?.extent, settings.mapWidth, setLatLonCache]);

	const anim = {
		initial: { opacity: 0},
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: 0.2 }
	}

	const getStyle = () => {
		if (settings.zoom) return {
			width: settings.mapWidth + 'px',
			height: settings.mapHeight + 'px'
		}
		else return {}
	}

	return (
		<AnimatePresence mode="wait">
			{ layers.map(l => (l.id === layer &&
				<motion.div
					className="mapplic-layer"
					key={l.id}
					style={getStyle()}
					{...anim}
				>
					{ fileExtension(l.file) === 'svg'
						? <SvgLayer layer={l} />
						: <img src={l.file} alt={l.name} />
					}
					{ Editor &&
						<Editor
							source={data?.routes || []}
							setSource={val => setData({routes: val})}
							prefix="path_"
							parentScale={parentScale}
							active={routesEditing}
						/>
					}
					<Vectors source={data?.routes} parentScale={parentScale} active={routesEditing} />

					{ import.meta.env.VITE_PRO && settings.wayfinding &&
						<Suspense fallback={null}><AnimatedRoute layer={l.id} /></Suspense>
					}
				</motion.div>
			))}
		</AnimatePresence>
	)
}

const SvgLayer = ({layer, ...props}) => {
	const csv = useMapplicStore(state => state.csv);
	const search = useMapplicStore(state => state.search);
	const admin = useMapplicStore(state => state.admin);
	const filters = useMapplicStore(state => state.filters);
	const newLocation = useMapplicStore(state => state.newLocation);
	const dragging = useMapplicStore(state => state.dragging);
	const setEstPos = useMapplicStore(state => state.setEstPos);
	
	const displayList = useMapplicStore(state => state.displayList);
	const getFilterCount = useMapplicStore(state => state.getFilterCount);
	const getLocationById = useMapplicStore(state => state.getLocationById);
	const getSampledLocation = useMapplicStore(state => state.getSampledLocation);
	const settings = useMapplicStore(state => state.data.settings);
	const locations = useMapplicStore(state => state.data.locations);
	const layers = useMapplicStore(state => state.data.layers);

	const hovered = useMapplicStore(state => state.hovered);
	const setHovered = useMapplicStore(state => state.setHovered);
	const openLocation = useMapplicStore(state => state.openLocation);
	const location = useMapplicStore(state => state.location);

	const ref = useRef(null);

	const activateElement = (el) => {
		if (!el) return;

		const parent = el?.closest('[id^=MLOC]');
		if (parent) parent?.appendChild(el);
		el?.classList.add('mapplic-active');
	}

	useEffect(() => {
		if (ref.current) {
			ref.current.querySelectorAll('.mapplic-active').forEach(el => el.classList.remove('mapplic-active'));
			if (location) activateElement(ref.current.getElementById(location));
		}
	}, [location]);

	useEffect(() => {
		if (ref.current) {
			ref.current.querySelectorAll('.mapplic-highlight').forEach(el => el.classList.remove('mapplic-highlight'));
			if (hovered) ref.current.getElementById(hovered)?.classList.add('mapplic-highlight');
		}
	}, [hovered]);

	useEffect(() => {
		if (ref.current) {
			ref.current.querySelectorAll('.mapplic-filtered').forEach(el => el.classList.remove('mapplic-filtered'));
			highlightFiltered();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search, filters, csv]);

	useEffect(() => {
		if (ref.current && admin) {
			ref.current.querySelectorAll('.mapplic-new-location').forEach(el => el.classList.remove('mapplic-new-location'));
			if (newLocation) ref.current.getElementById(newLocation)?.classList.add('mapplic-new-location');
		}
	}, [admin, newLocation]);

	useEffect(() => {
		ref.current?.querySelectorAll('[id^=MLOC] > *').forEach(el => {
			settleLocation(el);
		});
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [locations, layers, csv]);

	const highlightFiltered = () => {
		if (search || getFilterCount() > 0) {
			displayList().forEach(l => {
				ref.current.getElementById(l.id)?.classList.add('mapplic-filtered');
			});
		}
	}
	
	const estimatePositions = () => {
		let estimates = {}
		ref.current.querySelectorAll('[id^=MLOC] > *').forEach(el => {
			if (!el.id || typeof el.getBBox !== 'function') return false;
			const bbox = el?.getBBox();
			const title = el.getAttribute('data-name');

			const pos = {
				coord: [roundTo((bbox.x + bbox.width/2) / settings.mapWidth, 4), roundTo((bbox.y + bbox.height/2) / settings.mapHeight, 4)],
				zoom: roundTo(Math.min(settings.mapWidth / (bbox.width + 40), settings.mapHeight / (bbox.height + 40)), 4),
				layer: layer.id,
				...(title && {title: title})
			}
			estimates = {...estimates, [el.id]: pos};

			settleLocation(el);
		});

		highlightFiltered();

		setEstPos(estimates);
	}

	const settleLocation = (el) => {
		el.setAttribute('class', layer.style || '');
		const loc = getLocationById(el.id);
		if (!loc.id) return;
		const sampled = getSampledLocation(loc);
		if (sampled.disable) return;
		if (sampled.color) el.setAttribute('fill', sampled.color);
		if (sampled.style) el.classList.add(sampled.style);
		if (location === el.id) activateElement(el);
	}

	const getId = (el) => el.closest('*[id^=MLOC] > *[id]')?.id;

	return (
		<SVG
			{...props}
			width={settings.mapWidth}
			height={settings.mapHeight}
			innerRef={ref}
			src={layer.file}
			onClick={e => {
				if (!dragging) openLocation(getId(e.target));
			}}
			onMouseMove={e => setHovered(getId(e.target))}
			onTouchStart={e => setHovered(getId(e.target))}
			onMouseOut={() => setHovered(false)}
			onTouchEnd={() => setHovered(false)}
			onLoad={() => estimatePositions()}
		/>
	)
}