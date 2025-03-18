export const roundTo = (number, decimals = 2) => {
	const mult = Math.pow(10, decimals);
	return Math.round(number * mult) / mult;
}

export const fileExtension = (url) => {
	return url?.split(/[#?]/)[0].split('.').pop().trim().toLowerCase();
}

export const replaceVars = (obj, field = 'desc') => {
	if (!obj || !obj[field]) return '';
	return obj[field].replace(/{{(\w+)}}/gi, (match, key) => obj[key.toLowerCase()]);
}

export const getTextColorFor = (color) => {
	if (!color) return '#fff';
	color = color.replace('#', '');
	const [r, g, b] = color.match(/.{2}/g).map(x => parseInt(x, 16));
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	const treshold = 0.8;
	return luminance > treshold ? '#000' : '#fff';
}