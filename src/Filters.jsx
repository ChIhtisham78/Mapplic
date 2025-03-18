import { motion } from 'framer-motion'
import { Sliders, X, Search, ArrowUpRight } from 'react-feather'
import classNames from 'classnames'
import useMapplicStore from './MapplicStore'

export const SearchFilter = ({value, anim}) => {
	const data = useMapplicStore(state => state.data);
	const filtersOpened = useMapplicStore(state => state.filtersOpened);

	const opened = () => (filtersOpened || data.settings.filtersAlwaysVisible) && data.filters?.length > 0;

	return (
		<div className={classNames('mapplic-search-filter', {'opened': opened()})}>
			<SearchBar value={value} />
			{ opened() && <Filters anim={anim} /> }
		</div>
	)
}

export const SearchBar = ({value}) => {
	const settings = useMapplicStore(state => state.data.settings);
	const filters = useMapplicStore(state => state.data.filters);
	const toggleFilters = useMapplicStore(state => state.toggleFilters);
	const toggleSidebar = useMapplicStore(state => state.toggleSidebar);
	const setSearch = useMapplicStore(state => state.setSearch);
	const filtersOpened = useMapplicStore(state => state.filtersOpened);
	const getFilterCount = useMapplicStore(state => state.getFilterCount);

	return (
		<div className="mapplic-search-bar">
			<label className="mapplic-search">
				<Search size={16} />
				<input type="text" placeholder={settings.searchText || 'Search'} spellCheck={false} onClick={() => toggleSidebar(true)} onInput={(e) => setSearch(e.target.value)} value={value}/>
				{ value && <button type="button" onClick={() => setSearch('')}><X size={12} /></button> }
			</label>
			<SingleSwitch value={!filtersOpened} active={filters?.length > 0 && !settings.filtersAlwaysVisible}>
				<button type="button" onClick={() => toggleFilters()}>
					<Sliders size={16}/>
					{ settings.accessibility && <span>Filter</span> }
					<Count nr={getFilterCount()} />
				</button>
			</SingleSwitch>
		</div>
	)
}

const SingleSwitch = ({children, value, active}) => {
	if (!active) return null;
	return (
		<div className="mapplic-switch">
			{ value && <div className="mapplic-switch-background"></div> }
			{ children }
		</div>
	)
}

const Count = ({nr}) => {
	if (nr < 1) return;
	return <small className="mapplic-count">{nr}</small>
}

const Filters = ({anim}) => {
	const filters = useMapplicStore(state => state.data.filters);
	const search = useMapplicStore(state => state.search);
	const getFilterCount = useMapplicStore(state => state.getFilterCount);

	if (!filters) return null;
	return (
		<motion.div className="mapplic-filters" key="filters" {...anim} style={{display: 'flex', flexDirection: 'column', overflowY: 'auto'}}>
			<div className="mapplic-filters-body">
				{ filters.map((f) => <Filter key={f.id} f={f} />)}
			</div>

			<FiltersFooter shown={getFilterCount() > 0 || search } />
		</motion.div>
	)
}

const FiltersFooter = ({shown}) => {
	const settings = useMapplicStore(state => state.data.settings);
	const displayList = useMapplicStore(state => state.displayList);
	const clearFilters = useMapplicStore(state => state.clearFilters);
	const toggleSidebar = useMapplicStore(state => state.toggleSidebar);
	const clearText = useMapplicStore(state => state.data.settings.clearText);

	if (!shown) return null;
	return (
		<div className="mapplic-filters-footer">
			<button type="button" onClick={clearFilters}>
				<X size={12} />
				{clearText || 'Clear'}
			</button>
			<button type="button" onClick={toggleSidebar}>
				<b>{ displayList(false).length }</b> { settings.foundText || 'found' }
				<ArrowUpRight size={12} />
			</button>
		</div>
	)
}

const Filter = ({f}) => {
	const filters = useMapplicStore(state => state.filters);
	const setFilter = useMapplicStore(state => state.setFilter);
	const groups = useMapplicStore(state => state.data.groups);

	if (f.disable) return;
	
	switch (f.type) {
		case 'tags':
			return (
				<div className="mapplic-tags" data-filter={f?.id}>
					{ groups && groups.map(g => <Tag key={g.name} group={g} active={Array.isArray(filters.group) && filters.group.includes(g.name)} />) }
				</div>
			)
		case 'checkbox':
			return (
				<label className="mapplic-toggle" data-filter={f?.id}>
					<span>{f.name}</span>
					<div className="mapplic-toggle-switch">
						<input type="checkbox" checked={filters[f.id] || false} onChange={() => setFilter(f.id, !filters[f.id])}/><span></span>
					</div>
				</label>
			)
		case 'dropdown':
			return (
				<label data-filter={f?.id}>
					<select className="mapplic-dropdown" value={filters[f.id]} onChange={e => setFilter(f.id, e.target.value)}>
						{f.value?.split(';').map(v => {
							const pair = v.split(':');
							return <option key={v} value={pair[0]}>{pair[1]}</option>
						})}
					</select>
				</label>
			)
		case 'toggle':
			return (
				<div className="mapplic-filter-toggle" data-filter={f?.id}>
					{f.value?.split(';').map(v => {
						const pair = v.split(':');
						return <button type="button" className={classNames({'mapplic-selected': (!filters[f.id] && pair[0] === '') || filters[f.id] === pair[0]})} onClick={e => setFilter(f.id, pair[0])} key={v}>{pair[1]}</button>
					})}
				</div>
			)
		default:
			return
	}
}

function Tag({group, active}) {
	const toggleGroup = useMapplicStore(state => state.toggleGroup);
	
	const style = {
		color: active ? '#fff' : group.color
	}
	
	if (active) {
		style.borderColor = group.color;
		style.backgroundColor = group.color;
	}
	
	if (group.hide) return false;
	return (
		<button
			type="button"
			className={classNames('mapplic-tag', {'mapplic-active': active})}
			style={style}
			onClick={() => toggleGroup(group, active)}
		>
			{ group.name }
		</button>
	)
}