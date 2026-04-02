// Fetch charity and second-hand shops from OpenStreetMap using Overpass API
export async function fetchOsmShops(lat, lng, radiusMeters = 5000) {
    const endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
        "https://overpass.nchc.org.tw/api/interpreter",
    ];

    // Overpass QL query to find nodes, ways, and relations tagged as charity or second-hand shops within the specified radius
    const query = `
    [out:json][timeout:45];
    (
      nwr["shop"="charity"](around:${radiusMeters},${lat},${lng});
      nwr["shop"="second_hand"](around:${radiusMeters},${lat},${lng});
    );
    out tags center;
  `;

    let lastErr = null;

    // Try each endpoint in order until we get a successful response
    for (const url of endpoints) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                body: `data=${encodeURIComponent(query)}`,
            });

            if (!res.ok) {
                lastErr = new Error(`Overpass error: ${res.status}`);
                continue;
            }

            const data = await res.json();
            const elements = Array.isArray(data?.elements) ? data.elements : [];

            return elements
                .map((el) => {
                    const latOut = el.lat ?? el.center?.lat;
                    const lngOut = el.lon ?? el.center?.lon;
                    if (typeof latOut !== "number" || typeof lngOut !== "number") return null;

                    const tags = el.tags ?? {};
                    const name = tags.name ?? "Unnamed shop";
                    const addr = tags["addr:street"] ? `${tags["addr:housenumber"] || ""} ${tags["addr:street"]}`.trim() : "";

                    return {
                        id: `${el.type}-${el.id}`,
                        name: name,
                        address: addr,
                        // Create a single readable string here
                        displayName: addr ? `${name} (${addr})` : name,
                        lat: latOut,
                        lng: lngOut,
                    };
                })
                .filter(Boolean);
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr ?? new Error("Failed to load shops");
} 