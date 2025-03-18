import { useEffect, useState } from 'react'
import { useQueryParamsState } from './hooks/useQueryParamsState'
import useMapplicStore from './MapplicStore'

export const Deeplinking = ({enabled, children}) => {
	const loading = useMapplicStore(state => state.loading);
	const location = useMapplicStore(state => state.location);
	const openLocation = useMapplicStore(state => state.openLocation);
	const setFrom = useMapplicStore(state => state.setFrom);
	const setTo = useMapplicStore(state => state.setTo);

	const [locationParam, setLocationParam] = useQueryParamsState('location');
	const [initial, setInitial] = useState(false);

	const [fromParam] = useQueryParamsState('from');
	const [toParam] = useQueryParamsState('to');
	
	useEffect(() => {
		if (!enabled) return;
		if (!loading && !initial && locationParam) {
			setInitial(locationParam);
			setTimeout(() => openLocation(locationParam), 200);
		}

		if (initial && locationParam && locationParam !== initial) {
			setInitial(true);
			openLocation(locationParam);
		}
	}, [enabled, loading, initial, setInitial, locationParam, openLocation]);

	useEffect(() => {
		if (!enabled) return;
		if (location === null) setLocationParam('');
		if (location) setLocationParam(location);
	}, [enabled, location, setLocationParam]);

	useEffect(() => {
		setFrom(fromParam);
	}, [fromParam, setFrom])

	useEffect(() => {
		setTo(toParam);
	}, [toParam, setTo])

	return children;
}