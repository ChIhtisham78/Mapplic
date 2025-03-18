import { useEffect } from 'react'
import { roundTo } from './utils'
import useMapplicStore from './MapplicStore'

const distance = (a, b) => roundTo(Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2));
	
const pointExists = (list, x, y, layer) => {
	for (let i = 0; i < list.length; i++) {
		if ((list[i].x === x) && (list[i].y === y) && (list[i].layer === layer)) return list[i];
	}
	return null;
}

const addPoint = (graph, x, y, layer, endpoint, connect) => {
	let point = pointExists(graph, x, y, layer);
	if (!point) {
		graph.push({x, y, layer, n: []})
		point = graph[graph.length - 1];
		if (endpoint) point.end = endpoint;
		if (connect) point.connect = connect;
	}
	return point;
}

const linkPoint = (a, b, dist = 1, realDist = 1, iac) => {
	if (!pointExists(a.n, b.x, b.y)) {
		const link = { to: b, dist: dist, realDist: realDist };
		if (iac) link.iac = true; // inaccessible

		a.n.push(link);
	}
}

const buildGraph = (routes) => {
	const graph = [];

	routes?.forEach(el => {
		const points = el?.points.split(' ');
		const list = [];

		for (let i = 0; i < points.length; i++) {
			const [x, y] = points[i].split(',');
			const p = addPoint(graph, x, y, el.layer, el.endpoint, el.connect);

			if (i > 0) {
				const realDist = distance(p, list[list.length - 1]); // used for animation
				let dist = realDist * (parseFloat(el.weight) || 1);
				
				linkPoint(p, list[list.length - 1], dist, realDist, el.inaccessible);
				linkPoint(list[list.length - 1], p, dist, realDist, el.inaccessible);

				if (el.element === 'polygon') {
					for (let j = list.length - 2; j >= 0; j--) {
						dist = distance(p, list[j]);
						linkPoint(p, list[j], dist, dist, el.inaccessible);
						linkPoint(list[j], p, dist, dist, el.inaccessible);
					}
				}
			}
			list.push(p);
		}
	});

	// connect layers
	for (let i = 0; i < graph.length; i++) {
		if (graph[i].connect && graph[i].end && graph[i].n.length < 2) {
			for (var j = i + 1; j < graph.length; j++) {
				if (graph[j].connect && graph[j].end && graph[j].n.length < 2 && graph[i].end === graph[j].end) {
					linkPoint(graph[i], graph[j], 1);
					linkPoint(graph[j], graph[i], 1);
				}
			}
		}
	}

	return graph;
}

export const useRoutes = () => {
	const wayfinding = useMapplicStore(state => state.data?.settings?.wayfinding);
	const routes = useMapplicStore(state => state.data.routes);
	const setRouteGraph = useMapplicStore(state => state.setRouteGraph);

	useEffect(() => {
		if (wayfinding) setRouteGraph(buildGraph(routes));
	}, [routes, setRouteGraph, wayfinding]);
}