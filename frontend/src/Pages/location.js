const apiKey = '5b3ce3597851110001cf624803476a0560264b9193a32cc8a45b4ce2';

async function geocodeAddress(address) {
    const url = `https://api.openrouteservice.org/geocode/search?text=${encodeURIComponent(address)}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': apiKey
        }
    });
    
    const data = await response.json();
    
    // Check if there are any results before accessing coordinates
    if (data.features && data.features.length > 0) {
        return data.features[0].geometry.coordinates;
    } else {
        throw new Error('Address not found');
    }
}

async function calculateDistance(origin, destination) {
    try {
        const originCoords = await geocodeAddress(origin);
        const destinationCoords = await geocodeAddress(destination);

        const matrixUrl = `https://api.openrouteservice.org/v2/matrix/driving-car`;
        const body = JSON.stringify({
            locations: [originCoords, destinationCoords],
            metrics: ["distance", "duration"]
        });

        const matrixResponse = await fetch(matrixUrl, {
            method: 'POST',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: body
        });

        const matrixData = await matrixResponse.json();

        // Check if the matrix response contains valid distances
        if (matrixData.distances && matrixData.distances[0] && matrixData.distances[0][1] !== undefined) {
            const distance = matrixData.distances[0][1];
            const duration = matrixData.durations[0][1];

            console.log(`Distance: ${distance} meters, Duration: ${duration} seconds`);
            return { distance, duration };
        } else {
            throw new Error('Unable to calculate distance and duration');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

export default calculateDistance;
