import React, { Suspense } from 'react'
import { Fullscreen } from './Fullscreen'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Maximize, Plus, Minus } from 'react-feather'
import useMapplicStore from './MapplicStore'
const Legend = import.meta.env.VITE_PRO ? React.lazy(() => import('./extensions/Legend')) : null;
const RoutesPanel = import.meta.env.VITE_PRO ? React.lazy(() => import('./extensions/wayfinding/Panel')) : null;

export const Controls = (props) => {
	const settings = useMapplicStore(state => state.data.settings);
	const toggleSidebar = useMapplicStore(state => state.toggleSidebar);
	const sidebarClosed = useMapplicStore(state => state.sidebarClosed);
	const breakpoint = useMapplicStore(state => state.breakpoint);
	const containerMessage = useMapplicStore(state => state.containerMessage);

	return (
		<div className="mapplic-controls">
			{ settings.sidebar && settings.toggleSidebar && (!sidebarClosed || !settings.filters) &&
				<button className="mapplic-sidebar-close" onClick={() => toggleSidebar()}><ArrowLeft size={16}/></button>
			}
			<AnimatePresence>
				{ containerMessage === 'mouseWheelShift' && (
					<motion.div
						className="mapplic-controls-messages"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<div>Use <b className="mapplic-key">Shift</b> + <b>Scroll</b> to Zoom</div>
					</motion.div>
				)}
			</AnimatePresence>
			<ControlZone position="top-left" {...props} style={ settings.sidebar && settings.filters && sidebarClosed && !settings.rightSidebar && !breakpoint?.portrait ? {top: '60px'} : {} }/>
			<ControlZone position="top-right" {...props} style={ settings.sidebar && settings.filters && sidebarClosed && settings.rightSidebar && !breakpoint?.portrait ? {top: '60px'} : {} }/>
			<ControlZone position="bottom-left" {...props} style={ settings.sidebar && sidebarClosed && breakpoint?.portrait ? {bottom: '60px'} : {} }/>
			<ControlZone position="bottom-right" {...props} />
		</div>
	)
}

const ControlZone = ({position, element, style}) => {
	const layers = useMapplicStore(state => state.data.layers);
	const settings = useMapplicStore(state => state.data.settings);

	return (
		<div className={`mapplic-control-zone mapplic-${position}`} style={style}>
			{ import.meta.env.VITE_PRO && settings.legend === position && <Suspense fallback={null}><Legend /></Suspense> }
			{ settings.layerSwitcher === position && layers.length > 1 && <LayerSwitcher list={layers} /> }
			{ settings.zoom && settings.zoomButtons === position && <ZoomButtons /> }
			{ settings.zoom && settings.resetButton === position && <ResetButton accessibility={settings.accessibility} /> }
			{ settings.fullscreen === position && <Fullscreen element={element} className="mapplic-control-button" accessibility={settings.accessibility} />}
			{ import.meta.env.VITE_PRO && settings.wayfinding && settings.wayfindingControls === position && <Suspense fallback={null}>{<RoutesPanel />}</Suspense> }
		</div>
	)
}

const ResetButton = ({accessibility}) => {
	const pos = useMapplicStore(state => state.pos);
	const location = useMapplicStore(state => state.location);
	const closeLocation = useMapplicStore(state => state.closeLocation);
	
	if (pos.scale <= 1 && !location) return;
	return (
		<button type="button" className="mapplic-control-button" onClick={() => closeLocation(true)}>
			{ accessibility && <span>Reset</span> }
			<Maximize size={16} />
		</button>
	)
}

const ZoomButtons = () => {
	const maxZoom = useMapplicStore(state => state.data.settings.maxZoom);
	const pos = useMapplicStore(state => state.pos);
	const setTarget = useMapplicStore(state => state.setTarget);
	const setTransition = useMapplicStore(state => state.setTransition);

	const setZoom = (scale) => {
		setTransition({duration: 0.4});
		setTarget({scale: scale});
	}

	return (
		<div className="mapplic-control-group">
			<button
				type="button"
				className="mapplic-control-button"
				disabled={pos.scale  >= maxZoom}
				onClick={() => setZoom(pos.scale  * 1.6)}
			>
				<Plus size={16} />
			</button>
			<button
				type="button"
				className="mapplic-control-button"
				disabled={pos.scale  <= 1}
				onClick={() => setZoom(pos.scale  / 1.6)}
			>
				<Minus size={16} />
			</button>
		</div>
	)
}

const LayerSwitcher = ({list}) => {
	const layer = useMapplicStore(state => state.layer);
	const switchLayer = useMapplicStore(state => state.switchLayer);
	useMapplicStore(state => state.layer); // re-render

	return (
		<div className="mapplic-layer-switcher">
			{ list.map(l =>
				<button
					type="button"
					key={l.id}
					className={`${l.id === layer ? 'mapplic-active' : ''}`} onClick={() => switchLayer(l.id)}
					data-layer={l.id}
				>
					{l.name}
				</button>
			)}
		</div>
	)
}