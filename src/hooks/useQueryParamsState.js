import { useEffect, useState } from 'react'

export const useQueryParamsState = (param) => {
	const [value, setValue] = useState(() => {
		if (typeof window === 'undefined') return '';
		const { search } = window.location;
		const searchParams = new URLSearchParams(search);
		return searchParams.has(param) ? searchParams.get(param) : '';
	});
	
	useEffect(() => {
		const onPopState = (e) => {
			const urlParams = new URLSearchParams(window.location.search);
			const myParam = urlParams.get(param);
			setValue(myParam);
		}

		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	}, [param])

	useEffect(() => {
		const newUrl = new URL(window.location);
		if (newUrl.searchParams.get(param) !== value) {
			if (value) newUrl.searchParams.set(param, value);
			else newUrl.searchParams.delete(param);

			window.history.pushState(window.history.state, '', newUrl);
		}
	}, [param, value]);

	return [value, setValue];
};