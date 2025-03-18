import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchFilter } from './Filters'
import { Popup } from './Popup'
import classNames from 'classnames'
import useMapplicStore from './MapplicStore'

export const Directory = ({element}) => {
	const [scrollPosition, setScrollPosition] = useState(0);

	const breakpoints = useMapplicStore(state => state.data.breakpoint);
	const settings = useMapplicStore(state => state.data.settings);
	const sidebarClosed = useMapplicStore(state => state.sidebarClosed);
	const breakpoint = useMapplicStore(state => state.breakpoint);
	const search = useMapplicStore(state => state.search);
	const location = useMapplicStore(state => state.location);
	const getSampledLocation = useMapplicStore(state => state.getSampledLocation);
	useMapplicStore(state => state.filters); // re-render

	const popupOpened = () => location && getSampledLocation().action === 'sidebar';

	const anim = {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: 0.2 }
	}

	useEffect(() => {
		if (breakpoint?.sidebar) element.current.style.setProperty('--sidebar', breakpoint.sidebar + 'px');
	}, [element, breakpoints, breakpoint?.sidebar]);

	return (
		<div className="mapplic-sidebar">
			<AnimatePresence mode="wait">
				{ !popupOpened()
					? (
						<>
							{ settings.filters && <SearchFilter value={search  || ''} anim={anim} /> }
							{ !sidebarClosed && <DirectoryBody scrollPosition={scrollPosition} setScrollPosition={setScrollPosition} /> }
						</>

					)
					: (
						<motion.div className="mapplic-sidebar-popup" {...anim}>
							<Popup location={getSampledLocation()} />
						</motion.div>
					)
				}
			</AnimatePresence>
		</div>
	)
}

export const DirectoryBody = ({scrollPosition, setScrollPosition = () => false}) => {
	const list = useRef(null);

	const displayList = useMapplicStore(state => state.displayList);

	const handleScroll = () => {
		const position = list.current?.scrollTop;
		setScrollPosition(position);
	}

	useEffect(() => {
		if (list.current) {
			list.current.scrollTop = scrollPosition;
			list.current.addEventListener('scroll', handleScroll, { passive: true });
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
		return () => { list.current?.removeEventListener('scroll', handleScroll);};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [list.current]);

	return (
		<div className="mapplic-dir" ref={list}>
			<DirectoryItems locations={displayList(false)} />
		</div>
	)
}

const DirectoryItems = ({locations}) => {
	const search = useMapplicStore(state => state.search);
	const settings = useMapplicStore(state => state.data.settings);
	const groups = useMapplicStore(state => state.data.groups);
	const getFilterCount = useMapplicStore(state => state.getFilterCount);

	const groupBy = (groups, condition) => {
		if (!groups || !condition) return {};

		const grouped = groups.reduce((result, g) => {
			result[g] = locations.filter(l => condition(l, g));
			return result;
		}, {});

		return Object.entries(grouped);
	}

	if (locations.length < 1) return <i className="mapplic-empty-message">{ settings.noresultsText || 'No results found.'}</i>
	if (!settings.groupBy || getFilterCount() > 0 || search ) return <DirectoryGroup locations={locations} />
	else return groupBy(
			groups.map(g => g.name), // groups
			(l, g) => l.group?.includes(g) // condition
		).map(([group, items]) => <DirectoryGroup key={group} locations={items} group={group} />
	)
}

const DirectoryGroup = ({locations, group = null}) => {
	const breakpoint = useMapplicStore(state => state.breakpoint);
	const getSampledLocation = useMapplicStore(state => state.getSampledLocation);

	if (locations.length < 1) return null;
	return (
		<div className="mapplic-dir-group">
			<DirectoryGroupTitle group={group} count={locations.length} />
			<ul
				className={classNames('mapplic-dir-items', `mapplic-${breakpoint?.type}-items`)}
				style={{gridTemplateColumns: breakpoint?.column ? `repeat(${breakpoint.column}, 1fr)` : '100%'}}
			>
				{ locations.map(l =>
					<Item key={l.id} location={getSampledLocation(l)} />
				)}
			</ul>
		</div>
	)
}

const DirectoryGroupTitle = ({group, count}) => {
	if (!group) return null;
	return (
		<div className="mapplic-dir-group-title">
			<span>{group}</span>
			<div className="mapplic-line"></div>
			<span>{count}</span>
		</div>
	)
}

const Item = ({location, ...attributes}) => {
	const hovered = useMapplicStore(state => state.hovered);
	const setHovered = useMapplicStore(state => state.setHovered);
	const loc = useMapplicStore(state => state.location);
	const openLocation = useMapplicStore(state => state.openLocation);
	const breakpoint = useMapplicStore(state => state.breakpoint);
	const search = useMapplicStore(state => state.search);

	const handleClick = (e) => {
		e.preventDefault();
		openLocation(location.id);
	}

	const mark = (text) => text?.replace(new RegExp(search, 'gi'), match => `<mark>${match}</mark>`);

	return (
		<li data-location={location.id} data-group={location?.group}>
			<a 
				{...attributes}
				className={classNames('mapplic-dir-item', `mapplic-${breakpoint?.type}-item`, {
					'mapplic-highlight': hovered === location.id,
					'mapplic-active': loc === location.id
				})}
				onClick={handleClick} 
				onMouseEnter={() => setHovered(location.id)}
				onTouchStart={() => setHovered(location.id)}
				onMouseLeave={() => setHovered(false)}
				onTouchEnd={() => setHovered(false)}
			>
				<ItemBody location={location} mark={mark} type={breakpoint?.type} />
			</a>
		</li>
	)
}

const ItemBody = ({location, mark, type = 'list'}) => {
	const settings = useMapplicStore(state => state.data.settings);

	if (type === 'grid') return (
		<>
			{ settings.thumbnails && <Thumbnail location={location} /> }
			<div className="mapplic-item-body">
				<h3 dangerouslySetInnerHTML={{__html: mark(location.title)}}></h3>
				<h5 dangerouslySetInnerHTML={{__html: location.about}}></h5>
			</div>
		</>
	)

	return (
		<>
			{ settings.thumbnails && <Thumbnail location={location} /> }
			<div className="mapplic-item-body">
				<h4 dangerouslySetInnerHTML={{__html: mark(location.title)}}></h4>
				<h5 dangerouslySetInnerHTML={{__html: location.about}}></h5>
			</div>
		</>
	)
}

const Thumbnail = ({location}) => {
	const thumbContent = () => {
		if (!location.thumb) return <span>{location.title?.charAt(0)}</span>
		if (location.thumb.length <= 3) return <span>{location.thumb.toUpperCase()}</span>
		return <img src={location.thumb} alt={location.title} />
	}

	return (
		<div className="mapplic-thumbnail">{thumbContent()}</div>
	)
}