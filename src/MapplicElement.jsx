import { useEffect, useRef, useState } from 'react'
import { Directory } from './Directory'
import { Container } from './Container'
import { Styles } from './Styles'
import { useSize } from './hooks/useSize'
import { useDataLoader } from './dataLoader'
import { Deeplinking } from './Deeplinking'
import { useRoutes } from './Routes'
import useMapplicStore from './MapplicStore'
import classNames from 'classnames'
import './mapplic.css'

const MapplicElement = ({json, className, outerSettings, ...props}) => {
	const element = useRef(null);
	const size = useSize(element);

	const loading = useMapplicStore(state => state.loading);
	const error = useMapplicStore(state => state.error);
	const settings = useMapplicStore(state => state.data.settings);
	const sidebarClosed = useMapplicStore(state => state.sidebarClosed);
	const breakpoint = useMapplicStore(state => state.breakpoint);
	const breakpoints = useMapplicStore(state => state.data.breakpoints);
	const setBreakpoint = useMapplicStore(state => state.setBreakpoint);
	const deeplinking = useMapplicStore(state => state.data?.settings?.deeplinking);
	const dataLoaded = useMapplicStore(state => state.dataLoaded);
	const openLocation = useMapplicStore(state => state.openLocation);
	const setFixedFrom = useMapplicStore(state => state.setFixedFrom);
	const setOuterSettings = useMapplicStore(state => state.setOuterSettings);
	const search = useMapplicStore(state => state.search);
	useMapplicStore(state => state.data); // re-render

	const [clicked, setClicked] = useState(false);

	useDataLoader(json);
	
	useRoutes();

	// outer settings
	useEffect(() => {
		if (outerSettings) setOuterSettings(JSON.parse(outerSettings));
	}, [outerSettings, setOuterSettings]);

	// on load
	useEffect(() => {
		if (dataLoaded && props.location) setTimeout(() => openLocation(props.location), 600);
	}, [dataLoaded, openLocation, props.location]);

	// fixed from
	useEffect(() => {
		if (props.fixedfrom) setFixedFrom(props.fixedfrom);
	}, [dataLoaded, props.fixedfrom, setFixedFrom])

	// apply breakpoint
	useEffect(() => {
		const closestBreakpoint = breakpoints?.reduce(
			(max, curr) => size?.width <= curr.below && curr.below < max.below ? curr : max,
			{ below: 10000 }
		);

		setBreakpoint(closestBreakpoint);
	}, [size, breakpoints, setBreakpoint]);

	const getMaxHeight = () => {
		if (settings?.kiosk) return '100vh';
		else if (breakpoint?.element) return breakpoint.element + 'px';
		else return 'auto';
	}
	
	if (loading) return <div ref={element} className="mapplic-placeholder"><div className="mapplic-loader"></div></div>;
	if (error) return <div ref={element} className="mapplic-placeholder"><i>{error}</i></div>;
	return (
		<div
			{...props}
			ref={element}
			style={{maxHeight: getMaxHeight()}}
			className={classNames('mapplic-element', className, breakpoint?.name, {
				'mapplic-portrait': breakpoint?.portrait,
				'mapplic-sidebar-right': settings.rightSidebar,
				'mapplic-sidebar-closed': sidebarClosed && settings.toggleSidebar,
				'mapplic-sidebar-toggle': settings.toggleSidebar,
				'mapplic-filtered': search
			})}
			onClick={() => {
				if (!clicked) {
					window.dataLayer = window.dataLayer || [];
					window.dataLayer.push({'event': 'mapplicUsed'});
					setClicked(true);
				}
			}}
		>
			<Deeplinking enabled={deeplinking}>
				<Styles element={element} />
				<Container element={element}/>
				{ settings.sidebar && <Directory element={element} /> }
			</Deeplinking>
		</div>
	)
}

export default MapplicElement