// map.js

// =====================
// MAP INITIALIZATION
// =====================
var map = L.map('map').setView([14.5995, 120.9842], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// =====================
// COLOR LOGIC
// =====================
function getColor(risk) {
    switch (risk) {
        case 'Low': return 'green';
        case 'Moderate': return 'yellow';
        case 'High': return 'red';
        case 'Very High': return 'darkviolet';
        default: return 'lightgrey';
    }
}

function style(feature) {
    return {
        fillColor: getColor(feature.properties.risk_level),
        weight: 1,
        color: 'black',
        fillOpacity: 0.6
    };
}

// =====================
// NORMALIZATION
// =====================
function normalizeCity(name) {
    if (!name) return '';
    return name
        .replace(/\r/g, '')
        .replace(/\u00A0/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/^city of /i, '');
}

// =====================
// GLOBAL DATA
// =====================
var geojsonLayer = null;
var csvData = null;

// =====================
// LOAD DATA
// =====================
Promise.all([
    fetch('data/metro_manila.geojson').then(r => r.json()),
    fetch('data/metro_manila_risk_pivoted.csv').then(r => r.text())
]).then(([geojson, csvText]) => {

    console.log('GeoJSON loaded:', geojson.features.length, 'features');

    // Parse CSV
    var rows = csvText.split('\n').filter(r => r.trim() !== '');
    var headers = rows[0].split(',').map(h => h.trim());

    csvData = rows.slice(1).map(row => {
        var values = row.split(',').map(v => v.trim());
        var obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
    });

    console.log('CSV parsed:', csvData);

    // Initialize base map (grey)
    geojson.features.forEach(f => {
        f.properties.risk_level = 'Unknown';
    });

    geojsonLayer = L.geoJSON(geojson, { style }).addTo(map);

}).catch(err => {
    console.error('LOAD ERROR:', err);
});

// =====================
// BUTTON FUNCTIONS
// =====================
function showBaseMap() {
    console.log('Reset to base map');

    if (!geojsonLayer) return;

    geojsonLayer.eachLayer(layer => {
        layer.feature.properties.risk_level = 'Unknown';
        layer.setStyle(style(layer.feature));
    });
}

function updateMap(year) {
    if (!geojsonLayer || !csvData) {
        console.warn('Map or CSV not ready');
        return;
    }

    var column = year + '_risk';
    console.log('Updating map for:', column);

    // Build lookup
    var riskLookup = {};
    csvData.forEach(row => {
        if (row.city && row[column]) {
            var city = normalizeCity(row.city);
            var risk = row[column].trim();

            if (risk.toLowerCase() === 'very high') {
                risk = 'Very High';
            }

            riskLookup[city] = risk;
        }
    });

    console.log('Risk lookup:', riskLookup);

    // Apply styles
    geojsonLayer.eachLayer(layer => {
        var city = normalizeCity(layer.feature.properties.adm3_en);
        var risk = riskLookup[city] || 'Unknown';

        console.log(city, '→', risk);

        layer.feature.properties.risk_level = risk;
        layer.setStyle(style(layer.feature));
    });
}
