// Geo helpers used to validate that a Dynamic Worker ran in a Cloudflare
// location close to the configured placement region.
//
// The data below is a curated (non-exhaustive) subset. It is enough to
// demonstrate and validate placement for the most common regions/colos. Add
// more entries as needed.

// Cloud provider regions -> approximate lat/lng + human label.
// Format matches Cloudflare placement hints: "{provider}:{region}".
// https://developers.cloudflare.com/workers/configuration/placement/#list-supported-regions
export const CLOUD_REGIONS = {
	// --- AWS ---
	"aws:us-east-1": { lat: 39.0438, lng: -77.4874, label: "AWS N. Virginia (us-east-1)" },
	"aws:us-east-2": { lat: 40.4173, lng: -82.9071, label: "AWS Ohio (us-east-2)" },
	"aws:us-west-1": { lat: 37.7749, lng: -122.4194, label: "AWS N. California (us-west-1)" },
	"aws:us-west-2": { lat: 45.8399, lng: -119.7006, label: "AWS Oregon (us-west-2)" },
	"aws:eu-west-1": { lat: 53.3498, lng: -6.2603, label: "AWS Ireland (eu-west-1)" },
	"aws:eu-west-2": { lat: 51.5074, lng: -0.1278, label: "AWS London (eu-west-2)" },
	"aws:eu-central-1": { lat: 50.1109, lng: 8.6821, label: "AWS Frankfurt (eu-central-1)" },
	"aws:ap-southeast-1": { lat: 1.3521, lng: 103.8198, label: "AWS Singapore (ap-southeast-1)" },
	"aws:ap-southeast-2": { lat: -33.8688, lng: 151.2093, label: "AWS Sydney (ap-southeast-2)" },
	"aws:ap-northeast-1": { lat: 35.6895, lng: 139.6917, label: "AWS Tokyo (ap-northeast-1)" },
	"aws:sa-east-1": { lat: -23.5505, lng: -46.6333, label: "AWS São Paulo (sa-east-1)" },

	// --- GCP ---
	"gcp:us-east4": { lat: 39.0438, lng: -77.4874, label: "GCP N. Virginia (us-east4)" },
	"gcp:us-central1": { lat: 41.262, lng: -95.8608, label: "GCP Iowa (us-central1)" },
	"gcp:us-west1": { lat: 45.5946, lng: -121.1787, label: "GCP Oregon (us-west1)" },
	"gcp:europe-west1": { lat: 50.4699, lng: 3.8177, label: "GCP Belgium (europe-west1)" },
	"gcp:europe-west2": { lat: 51.5074, lng: -0.1278, label: "GCP London (europe-west2)" },
	"gcp:europe-west3": { lat: 50.1109, lng: 8.6821, label: "GCP Frankfurt (europe-west3)" },
	"gcp:europe-west4": { lat: 53.4386, lng: 6.8355, label: "GCP Netherlands (europe-west4)" },
	"gcp:asia-east1": { lat: 24.0518, lng: 120.5161, label: "GCP Taiwan (asia-east1)" },
	"gcp:asia-northeast1": { lat: 35.6895, lng: 139.6917, label: "GCP Tokyo (asia-northeast1)" },
	"gcp:asia-southeast1": { lat: 1.3521, lng: 103.8198, label: "GCP Singapore (asia-southeast1)" },

	// --- Azure ---
	"azure:eastus": { lat: 37.3719, lng: -79.8164, label: "Azure East US (eastus)" },
	"azure:westus": { lat: 37.7749, lng: -122.4194, label: "Azure West US (westus)" },
	"azure:westeurope": { lat: 52.3676, lng: 4.9041, label: "Azure West Europe (westeurope)" },
	"azure:northeurope": { lat: 53.3498, lng: -6.2603, label: "Azure North Europe (northeurope)" },
	"azure:southeastasia": { lat: 1.3521, lng: 103.8198, label: "Azure Southeast Asia (southeastasia)" }
};

// Cloudflare data centers (colos) by IATA airport code -> lat/lng + label.
// Non-exhaustive; covers common colos. Unknown colos still display their code.
export const COLOS = {
	AMS: { lat: 52.3105, lng: 4.7683, city: "Amsterdam", country: "NL" },
	ARN: { lat: 59.6519, lng: 17.9186, city: "Stockholm", country: "SE" },
	ATL: { lat: 33.6407, lng: -84.4277, city: "Atlanta", country: "US" },
	BOM: { lat: 19.0896, lng: 72.8656, city: "Mumbai", country: "IN" },
	CDG: { lat: 49.0097, lng: 2.5479, city: "Paris", country: "FR" },
	DFW: { lat: 32.8998, lng: -97.0403, city: "Dallas", country: "US" },
	DUB: { lat: 53.4213, lng: -6.2701, city: "Dublin", country: "IE" },
	EWR: { lat: 40.6895, lng: -74.1745, city: "Newark", country: "US" },
	FRA: { lat: 50.0379, lng: 8.5622, city: "Frankfurt", country: "DE" },
	GRU: { lat: -23.4356, lng: -46.4731, city: "São Paulo", country: "BR" },
	HKG: { lat: 22.308, lng: 113.9185, city: "Hong Kong", country: "HK" },
	IAD: { lat: 38.9531, lng: -77.4565, city: "Ashburn", country: "US" },
	ICN: { lat: 37.4602, lng: 126.4407, city: "Seoul", country: "KR" },
	LAX: { lat: 33.9416, lng: -118.4085, city: "Los Angeles", country: "US" },
	LHR: { lat: 51.47, lng: -0.4543, city: "London", country: "GB" },
	MAD: { lat: 40.4983, lng: -3.5676, city: "Madrid", country: "ES" },
	MIA: { lat: 25.7959, lng: -80.287, city: "Miami", country: "US" },
	NRT: { lat: 35.772, lng: 140.3929, city: "Tokyo", country: "JP" },
	ORD: { lat: 41.9742, lng: -87.9073, city: "Chicago", country: "US" },
	SEA: { lat: 47.4502, lng: -122.3088, city: "Seattle", country: "US" },
	SFO: { lat: 37.6213, lng: -122.379, city: "San Francisco", country: "US" },
	SIN: { lat: 1.3644, lng: 103.9915, city: "Singapore", country: "SG" },
	SJC: { lat: 37.3639, lng: -121.9289, city: "San Jose", country: "US" },
	SYD: { lat: -33.9399, lng: 151.1753, city: "Sydney", country: "AU" },
	TPE: { lat: 25.0797, lng: 121.2342, city: "Taipei", country: "TW" },
	YYZ: { lat: 43.6777, lng: -79.6248, city: "Toronto", country: "CA" },
	ZRH: { lat: 47.4647, lng: 8.5492, city: "Zurich", country: "CH" }
};

// Distance in kilometers between two lat/lng points (haversine).
export function haversineKm(a, b) {
	const R = 6371;
	const toRad = (d) => (d * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const lat1 = toRad(a.lat);
	const lat2 = toRad(b.lat);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
	return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// Describe a colo code using our lookup table.
export function describeColo(code) {
	if (!code) return { code: null, label: "unknown" };
	const upper = String(code).toUpperCase();
	const known = COLOS[upper];
	return {
		code: upper,
		city: known?.city ?? null,
		country: known?.country ?? null,
		lat: known?.lat ?? null,
		lng: known?.lng ?? null,
		label: known ? `${known.city}, ${known.country} (${upper})` : upper
	};
}

// Validate that `colo` is "closest" to the configured placement `region`.
//
// Heuristic (this is a demo, not a routing oracle):
//   - resolve the region to lat/lng
//   - measure distance from the region to the colo the Dynamic Worker ran in
//   - also compute the nearest colo *we know about* to the region as a reference
//   - PASS if the observed colo is within `thresholdKm` of the region.
export function validatePlacement(region, coloCode, thresholdKm = 2000) {
	const regionInfo = CLOUD_REGIONS[region];
	const colo = describeColo(coloCode);

	if (!regionInfo) {
		return {
			ok: false,
			reason: `Unknown placement region "${region}". No coordinates on file to validate against.`,
			region,
			regionLabel: region,
			expectedNearestColo: null,
			observedColo: colo,
			distanceKm: null,
			thresholdKm
		};
	}

	// Nearest known colo to the target region (a reference "expected" answer).
	let expectedNearestColo = null;
	let best = Infinity;
	for (const [code, c] of Object.entries(COLOS)) {
		const d = haversineKm(regionInfo, c);
		if (d < best) {
			best = d;
			expectedNearestColo = { ...describeColo(code), distanceKm: d };
		}
	}

	if (colo.lat == null) {
		return {
			ok: false,
			reason: `Dynamic Worker ran in colo ${colo.code}, which is not in the demo's colo table, so distance can't be computed. Expected something near ${expectedNearestColo?.label}.`,
			region,
			regionLabel: regionInfo.label,
			expectedNearestColo,
			observedColo: colo,
			distanceKm: null,
			thresholdKm
		};
	}

	const distanceKm = haversineKm(regionInfo, colo);
	const ok = distanceKm <= thresholdKm;
	return {
		ok,
		reason: ok
			? `Dynamic Worker ran in ${colo.label}, ${distanceKm} km from ${regionInfo.label} (within ${thresholdKm} km).`
			: `Dynamic Worker ran in ${colo.label}, ${distanceKm} km from ${regionInfo.label} (outside ${thresholdKm} km). Expected something near ${expectedNearestColo?.label}.`,
		region,
		regionLabel: regionInfo.label,
		expectedNearestColo,
		observedColo: colo,
		distanceKm,
		thresholdKm
	};
}
