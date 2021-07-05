import { createServices } from '@/services';

export default createServices({
	get: {
		url: '/v1/gantry/road/site/locations',
		method: 'GET'
	}

});
