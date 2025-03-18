import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Controls } from './Controls'
import { PanZoom } from './PanZoom'
import { Overlay } from './Overlay'
import { Layers } from './Layers'
import { useSize } from './hooks/useSize'
import useMapplicStore from './MapplicStore'

export const Container = ({element}) => {
	const [aspectRatio, setAspectRatio] = useState(1.6);

	const settings = useMapplicStore(state => state.data.settings);
	const layers = useMapplicStore(state => state.data.layers);
	const breakpoint = useMapplicStore(state => state.breakpoint);
	const location = useMapplicStore(state => state.location);
	const sidebarClosed = useMapplicStore(state => state.sidebarClosed);

	const container = useRef(null);
	const containerSize = useSize(container);
	
	useEffect(() => {
		if (settings?.mapWidth && settings?.mapHeight) setAspectRatio(settings.mapWidth / settings.mapHeight);
		else setAspectRatio(1.6);
	}, [settings.mapHeight, settings.mapWidth])

	useEffect(() => {
		if (settings.padding) element.current.style.setProperty('--container-padding', settings.padding + 'px');
	}, [element, settings.padding]);

	useEffect(() => {
		if (breakpoint?.portrait && container.current.getBoundingClientRect().top < 0) {
			if (document.documentElement.scrollHeight > document.documentElement.clientHeight) {
				window.scrollTo({
					top: container.current.getBoundingClientRect().top + window.scrollY - (settings.scrollTop || 0),
					behavior: 'smooth'
				});
			}
			else container.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, [breakpoint?.portrait, location, settings.scrollTop])

	const getSidebarWidth = () => {
		if (breakpoint?.sidebar) return breakpoint?.sidebar + 'px';
		if (element.current) return getComputedStyle(element.current).getPropertyValue('--sidebar');
		return 0;
	}

	const getHeight = () => {
		if (settings?.kiosk && !breakpoint?.portrait) return '100vh';
		else if (breakpoint?.container) return breakpoint.container + 'px';
		else return 'auto';
	}
	
	return (
		<motion.div
			className="mapplic-container"
			ref={container}
			initial={false}
			transition={{ duration: 0.4 }}
			animate={{
				marginLeft: !sidebarClosed && !settings.rightSidebar && settings.sidebar ? getSidebarWidth() : 0,
				marginRight: !sidebarClosed && settings.rightSidebar && settings.sidebar ? getSidebarWidth() : 0
			}}
			style={{height: getHeight()}}
		>
			{ settings.zoom ? <PanZoom container={container} containerSize={containerSize} aspectRatio={aspectRatio} /> : (
				<motion.div className="mapplic-layers">
					<Layers list={layers} />
					<Overlay aspectRatio={aspectRatio} width={settings?.mapWidth} />
				</motion.div>
			)}
			
			<Controls element={element} />
		</motion.div>
	)
}