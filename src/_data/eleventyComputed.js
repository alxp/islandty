module.exports = {
	schemaMetadata: {
		title: (data) => data.title,
		description: (data) => data.description,
        url: (data) => 'https://example.com/',
		'site': {
			url: 'https://islandty.alxp.ca',
			name: 'Islandty home page',
	    description: (data) => data.description,
	    url: 'https://example.com',
	    logo: {
      	src: 'https://example.com/images/logo.png',
      	width: 1200,
      	height: 630,
			},
		},
		image: {
			src: 'https://example.com/logo2.png',
		},
	},
};
