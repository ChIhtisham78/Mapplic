import { createContext, useContext, useEffect } from 'react'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore, useStore } from 'zustand'
import { replaceVars } from './utils'

const createMapplicStore = () => createStore(subscribeWithSelector((set, get) => ({
	// vectors
	selectedVector: null,
	setSelectedVector: (val) => set({selectedVector: val}),
	getVectorById: (id = get().selectedVector) => get().data?.routes?.find(r => r.id === id),
	routesEditing: false,
	setRoutesEditing: (val) => set({routesEditing: val}),

	// wayfinding
	from: null,
	to: null,
	setFrom: (val) => set({from: val, to: get().to === val ? null : get().to}),
	setTo: (val) => set({to: val, from: get().from === val ? null : get().from}),
	setAny: (val) => {
		if (!get().to || get().from) get().setTo(val);
		else get().setFrom(val);
		set({routesOpened: true})
	},
	hasRoute: (val) => get().routeGraph.some(point => point.end === val),

	routesAccessible: false,
	setRoutesAccessible: (val) => set({routesAccessible: val}),

	routesOpened: false,
	setRoutesOpened: (val) => set({routesOpened: val}),

	routeGraph: [],
	setRouteGraph: (val) => set({routeGraph: val}),

	paths: [],
	setPaths: (val) => set({paths: val}),
	animatedPath: false,
	setAnimatedPath: (val) => {
		const next = get().paths[val];
		set({
			animatedPath: val,
			layer: next ? next[0].layer : get().layer
		});
	},

	setFixedFrom: (val) => {
		set((state) => ({
			from: val,
			data: {
				...state.data,
				settings: {
					...state.data.settings,
					wayfindingFixedFrom: val,
				},
				locations: state.data.locations?.map(l => l.id !== val ? l : {...l, disable: false})
			},
		}))
	},
	
	//
	outerSettings: {},
	setOuterSettings: (val) => set({outerSettings: val}),

	// all
	loading: true,
	dataLoaded: false,
	error: null,
	admin: false,
	hovered: false,
	offset: { w: 0, h: 0}, //TBD
	setOffset: (val) => set(state => ({
		offset: { ...state.offset, ...val }
	})),

	target: { scale: 1, x: 0.5, y: 0.5 },
	pos: { scale: 1, x: 0.5, y: 0.5},
	location: undefined,
	transition: { duration: 0 },
	breakpoint: {},
	dragging: false,
	sidebarClosed: false,
	portrait: false,
	layer: false,
	filters: {},
	filterLogic: {},
	filtersOpened: false,
	estPos: {},
	data: {},
	csv: [],
	latLonCache: {},

	setLatLonCache: () => {
		const settings = get().data?.settings;
		if (!settings?.geo || !settings?.extent) {
			set({latLonCache: {}});
			return;
		}
		let deltaLon = settings.extent[2] - settings.extent[0],
			bottomLatDegree = settings.extent[1] * Math.PI / 180,
			mapWidth = ((settings?.mapWidth / deltaLon) * 360) / (2 * Math.PI),
			mapOffsetY = (mapWidth / 2 * Math.log((1 + Math.sin(bottomLatDegree)) / (1 - Math.sin(bottomLatDegree))));
		set({latLonCache: { deltaLon, mapWidth, mapOffsetY }});
	},

	latLonToXY: (latlon) => {
		const settings = get().data?.settings;
		if (!latlon || !settings.geo || !settings.extent) return false;
		const lat = latlon[0] * Math.PI / 180;
		return [
			((latlon[1] - settings.extent[0]) * (settings.mapWidth / get().latLonCache.deltaLon)) / settings.mapWidth,
			(settings.mapHeight - ((get().latLonCache.mapWidth / 2 * Math.log((1 + Math.sin(lat)) / (1 - Math.sin(lat)))) - get().latLonCache.mapOffsetY)) / settings.mapHeight
		]
	},

	containerMessage: null,
	setContainerMessage: (val) => set({containerMessage: val}),

	setData: (val) => set(state => ({ data: { ...state.data, ...val } })),
	setAdmin: (val) => set({admin: val}),

	fetchData: async (json) => {
		if (typeof json === 'object' && json !== null) {
			get().process(json);
			return;
		}
		if (typeof json === 'string' && json.trim().charAt(0) === '{') {
			get().process(JSON.parse(json));
			return;
		}
		try {
			const response = await fetch(json);
			let data = await response.json();
			set({source: json});
			get().process(data);
		} catch (error) {
			console.error('An error occurred while fetching map data: ', error);
			set({loading: false, error: 'Couldn\'t fetch map data.', data: {}});
		}
	},

	migrate: (data) => {
		// layers
		data.layers = data.levels;
		delete data.levels;
		data.layers.forEach(layer => {
			if ('map' in layer) {
				layer.file = layer.map;
				delete layer.map;
			}
			if ('title' in layer) {
				layer.name = layer.title;
				delete layer.title;
			}
		});

		// settings
		data.settings = {
			mapWidth: data.mapwidth,
			mapHeight: data.mapheight,
			resetButton: "bottom-right",
			zoomButtons: "bottom-right",
			layerSwitcher: "top-right",
			zoom: true,
			maxZoom: 3
		}
		delete data.mapwidth;
		delete data.mapheight;

		// breakpoints
		data.breakpoints = [
			{
				container: 600,
				below: 9000,
				name: "all-screens"
			},
			{
				portrait: true,
				name: "mobile",
				below: 480
			}
		];

		// locations
		if (!data.locations) {
			data.locations = data.layers
				.map(layer => layer.locations)
				.flat()
				.map(location => {
					return {
						layer: data.layers.find(layer => layer.locations.includes(location)).id,
						...location
					};
				});
			data.layers.forEach(layer => delete layer.locations);
		}

		data.locations.forEach(location => {
			if ('description' in location) {
				location.desc = location.description;
				delete location.description;
			}
			if ('x' in location && 'y' in location) {
				location.coord = [parseFloat(location.x), parseFloat(location.y)];
				delete location.x;
				delete location.y;
			}
			if ('fill' in location) {
				location.color = location.fill;
				delete location.fill;
			}
		});

		return data;
	},

	process: (data) => {
		if (!data.layers) {
			data = get().migrate(data);
		}
		const settings = { ...data.settings, ...get().outerSettings };

		set({
			loading: false,
			data: {
				...data,
				settings: settings
			},
			layer: settings?.layer || data?.layers[0].id,
			sidebarClosed: settings?.sidebarClosed && settings?.toggleSidebar,
			filters: data.filters ? Object.fromEntries(data.filters.filter(f => !f.disable).map(f => [f.id, f.default])) : {},
			filtersOpened: (settings?.filtersOpened && !settings?.sidebarClosed) || false,
			routesOpened: data?.settings?.wayfindingOpened || false
		});
		if (!data?.settings?.csv || !data?.settings?.csvEnabled) set({dataLoaded: true});

		get().setFilterLogic();
	},

	fetchCsv: async (promise) => {
		if (!get().data?.settings?.csv && !get().data?.settings?.csvEnabled) return false;
		try {
			const csv = await promise;
			set({csv: csv});
		} catch (error) {
			console.error('An error occured while fetching the CSV file: ', error);
			set({csv: []});
		} finally {
			set({dataLoaded: true});
		}
	},

	setFilterLogic: () => {
		let changed = false;
		const applyFunction = (id, logic) => {
			if (logic === get().filterLogic[id]?.logic) return get().filterLogic.apply;
			try {
				changed = true;

				// eslint-disable-next-line no-new-func
				return new Function('l', 'value', `return !value || ${logic} ? true : false`);
			}
			catch (e) {
				console.error(e.message);
				return undefined;
			}
		}
		
		let newLogic;
		if (get().data?.filters) newLogic = Object.fromEntries(get().data.filters.filter(i => !i.disable).map(i => [i.id, {'logic': i.logic, 'apply': applyFunction(i.id, i.logic) }]));
		if (changed) set({filterLogic: newLogic});
	},

	setCsv: (id) => set({ csv: id }),
	
	setHovered: (id) => set({ hovered: id }),
	setTarget: (val) => set(state => ({
		target: { ...state.target, ...val }
	})),
	setPos: (val) => set({pos: val}),
	setTransition: (val) => set({transition: val}),
	setDragging: (val) => set({dragging: val}),
	setBreakpoint: (val) => set({breakpoint: val}),
	setSearch: (val) => set({search: val}),

	setEstPos: (val) => set({estPos: val}),
	setNewLocation: (val) => set({newLocation: val}),

	// layers
	switchLayer: (val) => set({layer: val}),
	getLayer: (layer = get().layer) => get().data.layers.find(l => l.id === layer),

	// filters
	getFilterCount: () => Object.values(get().filters).filter(f => f === true || f?.length > 0).length,

	displayList: (hidden = true) => {
		let ids = new Set(get().data.locations?.map(l => l.id));

		let list = [...(get().data?.locations || []), ...get().csv?.filter(l => !ids.has(l.id))]
			.filter(l => l.sample !== 'true') // remove samples
			.map(l => get().getSampledLocation(l)) // apply samples
			.filter(l => l.disable !== true && (l.hide !== true || hidden)); // remove disabled and hidden

			
		if (get().data.settings.exclude) {
			// eslint-disable-next-line no-new-func
			list = list.filter(new Function('l', `return ${get().data.settings.exclude}`));
		}
		
		// develop applyfilters
		list = get().applyFilters(list);
		if (get().filters.group) list = get().applyGroups(list); // apply group search
		if (get().search) list = list.filter(get().appliedSearch); // apply search
		if (get().data.settings.ordered) list = list.sort((a,b) => a.title?.localeCompare(b.title)); // apply ordering

		return list;
	},

	applyFilters: (list) => {
		if (!get().data.filters) return list;
		return get().data.filters.reduce((filteredArray, filter) => {
			if (!get().filterLogic[filter.id]?.apply) return filteredArray;

			try {
				const value = get().filters[filter.id];
				return filteredArray.filter(l => {
					return get().filterLogic[filter.id].apply(l, value);
				});
			}
			catch (e) { return filteredArray; }
		}, [...list])
	},

	clearFilters: () => set(state => ({
		search: '',
		sidebarClosed: false,
		filtersOpened: false,
		filters: Object.keys(state.filters).reduce((a, k) => ({...a, [k]: false}), {})
	})),

	applyGroups: (list) => {
		if (get().filters.group.length < 1) return list;

		return list.filter(l => {
			if (!l.group) return false;
			return get().filters.group.some(g => l.group.includes(g));
		});
	},

	appliedSearch: (l) => {
		if (!l.title) return true;
		return `${l?.title} ${l?.about}`?.toLowerCase().normalize('NFD').includes(get().search.toLowerCase().normalize('NFD'));
	},

	toggleGroup: (group, active) => set(state => ({
		filters: {
			...state.filters,
			group: active ? state.filters.group.filter(g => g !== group.name) : (state.filters.group ? [ ...state.filters.group, group.name] : [group.name])
		}
	})),

	setFilter: (key, value) => set(state => ({
		filters: {
			...state.filters,
			[key]: value
		}
	})),

	// location
	getGlobalSample: () => get().data.samples?.find(s => s.id === 'def') || get().data.locations?.find(l => l.id === 'def'),
	getSample: (location, field = 'sample') => get().data?.samples?.find(s => s.id === location?.[field]) || get().data?.locations?.find(l => l.id === location?.[field]) || (location && get().getGlobalSample()) || {},
	getCoord: (location) => ({ coord: location?.coord || get().estPos[location?.id]?.coord || get().latLonToXY(location?.latlon) }),
	getSampledLocation: (location = get().getLocationById(), field = 'sample') => {
		const sampled = {
			...get().getCoord(location),
			...get().getSample(location, field),
			...location
		}

		sampled.desc = replaceVars(sampled, 'desc');
		sampled.about = replaceVars(sampled, 'about');

		return sampled;
	},
	getLocationById: (id = get().location) => [...(get().data?.locations || []), ...get().csv].find((loc) => loc.id === id) || {},
	openLocation: (id, duration = 0.8) => {
		const l = get().getLocationById(id);
		if (!l?.id) { // location doesn't exist
			if (get().admin) set({newLocation: id});
			return;
		}

		if (l.disable && !get().admin) return;

		if (l.action === 'link') {
			window.location.href = l.link;
			return;
		}

		if (l.action === 'switch' && !get().admin) {
			get().switchLayer(l.switch);
			get().setTarget({scale: 1});
			return;
		}

		const sampled = get().getSampledLocation(l);	
		
		set(state => ({
			location: sampled.id,
			newLocation: false,
			transition: { duration: duration },
			layer: sampled.layer || state.layer,
			target: { scale: sampled?.zoom || get().data.settings.maxZoom, x: sampled.coord[0], y: sampled.coord[1] },
			sidebarClosed: !state.sidebarClosed ? false : sampled.action !== 'sidebar'
		}));

	},
	closeLocation: (reset = false) => {
		if (reset || get().data.settings.closeReset) {
			get().setTransition({duration: 0.4});
			get().setTarget({scale: 1});
		}
		set({location: null, newLocation: false});
	},

	// others
	toggleSidebar: (turn) => set(state => ({
		location: false,
		filtersOpened: false,
		transition: { duration: 0 },
		sidebarClosed: turn === undefined ? !state.sidebarClosed : !turn
	})),
	toggleFilters: (turn) => set(state => ({
		sidebarClosed: false,
		filtersOpened: !state.filtersOpened
	}))
})));

const MapplicContext = createContext(null);
export const MapplicStore = ({ children, onStore }) => {
	const store = createMapplicStore();
	useEffect(() => {
		if (onStore) onStore(store);
	}, [onStore, store]);

	return <MapplicContext.Provider value={store}>{ children }</MapplicContext.Provider>
}

const useMapplicStore = (selector) => {
	const store = useContext(MapplicContext);
	if (store === null) throw new Error("no provider");
	return useStore(store, selector);
}

export default useMapplicStore