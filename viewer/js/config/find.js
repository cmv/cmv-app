define({
	map: true,
	queries: [
		{
			description: 'Find A Public Safety Location By Name',
			url: 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/PublicSafety/PublicSafetyOperationalLayers/MapServer',
			layerIds: [1, 2, 3, 4, 5, 6, 7],
			searchFields: ['FDNAME, PDNAME', 'NAME', 'RESNAME'],
			minChars: 2
		},
		{
			description: 'Find Incident By Code/Description',
			url: 'http://sampleserver1.arcgisonline.com/ArcGIS/rest/services/PublicSafety/PublicSafetyOperationalLayers/MapServer',
			layerIds: [15, 17, 18],
			searchFields: ['FCODE', 'DESCRIPTION'],
			minChars: 4
		}
	]
});