export async function searchLocations(searchTerm) {
  const params = new URLSearchParams({
    q: searchTerm,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
  })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)

  if (!response.ok) {
    throw new Error('The location search is temporarily unavailable. Please try again.')
  }

  const places = await response.json()
  return places.map((place) => ({
    ...place,
    zoom: place.type === 'postcode' ? 13 : place.type === 'city' ? 12 : 15,
  }))
}
