// Synthetic map locations use curated city centers, parks, and landmarks as
// exact coordinate anchors; no demo row represents a real person or private home.
export const DEMO_NEIGHBORHOODS = [
  { city: "Seattle, WA", neighborhood: "Capitol Hill", landmark: "Cal Anderson Park", address: "1635 11th Ave, Seattle, WA 98122", latitude: 47.6164, longitude: -122.3187 },
  { city: "Seattle, WA", neighborhood: "Ballard", landmark: "Ballard Commons Park", address: "5701 22nd Ave NW, Seattle, WA 98107", latitude: 47.6686, longitude: -122.3861 },
  { city: "Seattle, WA", neighborhood: "Fremont", landmark: "Gas Works Park", address: "2101 N Northlake Way, Seattle, WA 98103", latitude: 47.6456, longitude: -122.3344 },
  { city: "San Francisco, CA", neighborhood: "Mission District", landmark: "Mission Dolores Park", address: "19th St and Dolores St, San Francisco, CA 94114", latitude: 37.7596, longitude: -122.4269 },
  { city: "San Francisco, CA", neighborhood: "Marina District", landmark: "Marina Green", address: "200 Marina Blvd, San Francisco, CA 94123", latitude: 37.806595, longitude: -122.439972 },
  { city: "San Francisco, CA", neighborhood: "Richmond District", landmark: "Conservatory of Flowers", address: "100 John F Kennedy Dr, San Francisco, CA 94117", latitude: 37.7724, longitude: -122.4611 },
  { city: "Los Angeles, CA", neighborhood: "Echo Park", landmark: "Echo Park Lake", address: "751 Echo Park Ave, Los Angeles, CA 90026", latitude: 34.0775, longitude: -118.2607 },
  { city: "Los Angeles, CA", neighborhood: "Los Feliz", landmark: "Griffith Observatory", address: "2800 E Observatory Rd, Los Angeles, CA 90027", latitude: 34.1184, longitude: -118.3004 },
  { city: "Los Angeles, CA", neighborhood: "Venice", landmark: "Venice Beach Recreation Center", address: "1800 Ocean Front Walk, Venice, CA 90291", latitude: 33.985615, longitude: -118.472767 },
  { city: "Phoenix, AZ", neighborhood: "Encanto Village", landmark: "Encanto Park", address: "2605 N 15th Ave, Phoenix, AZ 85007", latitude: 33.4736, longitude: -112.0959 },
  { city: "Phoenix, AZ", neighborhood: "Central Avenue Corridor", landmark: "Steele Indian School Park", address: "300 E Indian School Rd, Phoenix, AZ 85012", latitude: 33.4958, longitude: -112.0709 },
  { city: "Phoenix, AZ", neighborhood: "Papago Park", landmark: "Papago Park", address: "625 N Galvin Pkwy, Phoenix, AZ 85008", latitude: 33.4635, longitude: -111.9450 },
  { city: "Denver, CO", neighborhood: "City Park", landmark: "Denver Museum of Nature & Science", address: "2001 Colorado Blvd, Denver, CO 80205", latitude: 39.7475, longitude: -104.9508 },
  { city: "Denver, CO", neighborhood: "Washington Park", landmark: "Washington Park Boathouse", address: "701 S Franklin St, Denver, CO 80209", latitude: 39.7006, longitude: -104.9719 },
  { city: "Denver, CO", neighborhood: "LoDo", landmark: "Confluence Park", address: "2250 15th St, Denver, CO 80202", latitude: 39.7541, longitude: -105.0085 },
  { city: "Dallas, TX", neighborhood: "Downtown", landmark: "Klyde Warren Park", address: "2012 Woodall Rodgers Fwy, Dallas, TX 75201", latitude: 32.7894, longitude: -96.8003 },
  { city: "Dallas, TX", neighborhood: "Lakewood", landmark: "White Rock Lake Bath House", address: "521 E Lawther Dr, Dallas, TX 75218", latitude: 32.8379, longitude: -96.7297 },
  { city: "Dallas, TX", neighborhood: "Bachman Lake", landmark: "Bachman Lake Park", address: "3500 W Northwest Hwy, Dallas, TX 75220", latitude: 32.8510, longitude: -96.8687 },
  { city: "Chicago, IL", neighborhood: "The Loop", landmark: "Millennium Park", address: "201 E Randolph St, Chicago, IL 60602", latitude: 41.8826, longitude: -87.6226 },
  { city: "Chicago, IL", neighborhood: "Lincoln Park", landmark: "Lincoln Park Conservatory", address: "2391 N Stockton Dr, Chicago, IL 60614", latitude: 41.9234, longitude: -87.6354 },
  { city: "Chicago, IL", neighborhood: "Hyde Park", landmark: "Jackson Park", address: "6401 S Stony Island Ave, Chicago, IL 60637", latitude: 41.7805, longitude: -87.5834 },
  { city: "Minneapolis, MN", neighborhood: "Loring Park", landmark: "Loring Park", address: "1382 Willow St, Minneapolis, MN 55403", latitude: 44.9688, longitude: -93.2861 },
  { city: "Minneapolis, MN", neighborhood: "Northeast Minneapolis", landmark: "Boom Island Park", address: "724 Sibley St NE, Minneapolis, MN 55413", latitude: 44.9911, longitude: -93.2704 },
  { city: "Minneapolis, MN", neighborhood: "Minnehaha", landmark: "Minnehaha Regional Park", address: "4801 S Minnehaha Dr, Minneapolis, MN 55417", latitude: 44.9151, longitude: -93.2118 },
  { city: "Atlanta, GA", neighborhood: "Midtown", landmark: "Piedmont Park", address: "400 Park Dr NE, Atlanta, GA 30306", latitude: 33.7861, longitude: -84.3735 },
  { city: "Atlanta, GA", neighborhood: "Grant Park", landmark: "Grant Park", address: "840 Cherokee Ave SE, Atlanta, GA 30315", latitude: 33.7373, longitude: -84.3704 },
  { city: "Atlanta, GA", neighborhood: "Westside", landmark: "Westside Park", address: "1660 Johnson Rd NW, Atlanta, GA 30318", latitude: 33.7810, longitude: -84.4306 },
  { city: "Miami, FL", neighborhood: "Downtown Miami", landmark: "Bayfront Park", address: "301 Biscayne Blvd, Miami, FL 33132", latitude: 25.775359, longitude: -80.186193 },
  { city: "Miami, FL", neighborhood: "Edgewater", landmark: "Margaret Pace Park", address: "1745 N Bayshore Dr, Miami, FL 33132", latitude: 25.7910, longitude: -80.1860 },
  { city: "Miami, FL", neighborhood: "Coconut Grove", landmark: "Peacock Park", address: "2820 McFarlane Rd, Miami, FL 33133", latitude: 25.7274, longitude: -80.2415 },
  { city: "Washington, DC", neighborhood: "Georgetown", landmark: "Georgetown Waterfront Park", address: "3303 Water St NW, Washington, DC 20007", latitude: 38.902543, longitude: -77.064210 },
  { city: "Washington, DC", neighborhood: "Capitol Hill", landmark: "Lincoln Park", address: "1400 East Capitol St SE, Washington, DC 20003", latitude: 38.8903, longitude: -76.9819 },
  { city: "Washington, DC", neighborhood: "Dupont Circle", landmark: "Dupont Circle", address: "1500 19th St NW, Washington, DC 20036", latitude: 38.9095, longitude: -77.0434 },
  { city: "New York, NY", neighborhood: "Greenwich Village", landmark: "Washington Square Park", address: "5 Ave and Waverly Pl, New York, NY 10012", latitude: 40.7308, longitude: -73.9973 },
  { city: "New York, NY", neighborhood: "Upper West Side", landmark: "Central Park, West 72nd Street entrance", address: "Central Park West and W 72nd St, New York, NY 10023", latitude: 40.7759, longitude: -73.9805 },
  { city: "New York, NY", neighborhood: "Brooklyn Heights", landmark: "Brooklyn Bridge Park", address: "334 Furman St, Brooklyn, NY 11201", latitude: 40.7003, longitude: -73.9967 },
  { city: "Boston, MA", neighborhood: "Downtown Boston", landmark: "Boston Common", address: "139 Tremont St, Boston, MA 02111", latitude: 42.3556, longitude: -71.0636 },
  { city: "Boston, MA", neighborhood: "Fenway", landmark: "Back Bay Fens", address: "100 Park Dr, Boston, MA 02215", latitude: 42.3417, longitude: -71.0997 },
  { city: "Boston, MA", neighborhood: "Jamaica Plain", landmark: "Arnold Arboretum", address: "125 Arborway, Boston, MA 02130", latitude: 42.3071, longitude: -71.1203 },
  { city: "Nashville, TN", neighborhood: "West End", landmark: "Centennial Park", address: "2500 West End Ave, Nashville, TN 37203", latitude: 36.1497, longitude: -86.8133 },
  { city: "Nashville, TN", neighborhood: "Downtown Nashville", landmark: "Cumberland Park", address: "592 S 1st St, Nashville, TN 37213", latitude: 36.1640, longitude: -86.7690 },
  { city: "Nashville, TN", neighborhood: "East Nashville", landmark: "Shelby Bottoms Nature Center", address: "1900 Davidson St, Nashville, TN 37206", latitude: 36.1815, longitude: -86.7233 },
  { city: "Kansas City, MO", neighborhood: "Country Club Plaza", landmark: "Loose Park", address: "5200 Wornall Rd, Kansas City, MO 64112", latitude: 39.0344, longitude: -94.5910 },
  { city: "Kansas City, MO", neighborhood: "River Market", landmark: "Berkley Riverfront Park", address: "1298 River Front Dr, Kansas City, MO 64120", latitude: 39.1195, longitude: -94.5914 },
  { city: "Kansas City, MO", neighborhood: "Swope Park", landmark: "Swope Park", address: "6900 Swope Pkwy, Kansas City, MO 64132", latitude: 38.9990, longitude: -94.5150 },
  { city: "San Diego, CA", neighborhood: "Balboa Park", landmark: "Balboa Park, El Prado", address: "1549 El Prado, San Diego, CA 92101", latitude: 32.7341, longitude: -117.1446 },
  { city: "San Diego, CA", neighborhood: "Mission Bay", landmark: "Mission Bay Park", address: "2688 E Mission Bay Dr, San Diego, CA 92109", latitude: 32.790272, longitude: -117.209468 },
  { city: "San Diego, CA", neighborhood: "Ocean Beach", landmark: "Sunset Cliffs Natural Park", address: "1253 Sunset Cliffs Blvd, San Diego, CA 92107", latitude: 32.727383, longitude: -117.255544 },
];

// Separate Duluth anchors keep this focused local cluster additive without
// changing the established nationwide neighborhood-cluster dataset.
export const DEMO_DULUTH_ANCHORS = [
  { city: "Duluth, GA", neighborhood: "Downtown Duluth", landmark: "Duluth Town Green", address: "3167 Main St, Duluth, GA 30096", latitude: 34.00266, longitude: -84.14608 },
  { city: "Duluth, GA", neighborhood: "Bunten Road", landmark: "Bunten Road Park", address: "3180 Bunten Rd, Duluth, GA 30096", latitude: 34.002222, longitude: -84.121389 },
  { city: "Duluth, GA", neighborhood: "McDaniel Farm", landmark: "McDaniel Farm Park", address: "3251 McDaniel Rd, Duluth, GA 30096", latitude: 33.968285, longitude: -84.127711 },
];

export const DEMO_PHOTOS = [
  { id: "dog-camera", species: "dog", fileName: "dog-camera.jpg", author: "StockyPics", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Dog_looking_into_camera_(20897835243).jpg" },
  { id: "dog-golden", species: "dog", fileName: "dog-golden.jpg", author: "Jusotil_1943", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Dog_(41625601132).jpg" },
  { id: "dog-grass", species: "dog", fileName: "dog-grass.jpg", author: "Editor abcdef", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Dog_lying_on_grass.JPG" },
  { id: "dog-puppy", species: "dog", fileName: "dog-puppy.jpg", author: "Karen Arnold", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Cute-puppy-dog-13626627873wL.jpg" },
  { id: "cat-tabby", species: "cat", fileName: "cat-tabby.jpg", author: "Roy Tanck", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Cat_portrait_(17236370444).jpg" },
  { id: "cat-green-eyes", species: "cat", fileName: "cat-green-eyes.jpg", author: "Kiwiev", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:Green-eyed_white_cat_looking_at_camera.jpg" },
  { id: "cat-sleepy", species: "cat", fileName: "cat-sleepy.jpg", author: "ABCDéLTDP", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:White_sleepy_cat.jpg" },
  { id: "cat-portrait", species: "cat", fileName: "cat-portrait.jpg", author: "Leon Brooks", license: "Public domain", source: "https://commons.wikimedia.org/wiki/File:Portrait_of_a_cat.jpg" },
];

export const DEMO_PHOTO_BY_ID = new Map(
  DEMO_PHOTOS.map((photo) => [photo.id, photo]),
);

export const DEMO_NEIGHBORHOODS_BY_CITY = new Map(
  DEMO_NEIGHBORHOODS.map((neighborhood) => {
    const grouped = DEMO_NEIGHBORHOODS.filter(
      (candidate) => candidate.city === neighborhood.city,
    );
    return [neighborhood.city, grouped];
  }),
);

export function chooseDemoPhoto(random, species) {
  const normalizedSpecies = species.toLowerCase();
  const photos = DEMO_PHOTOS.filter(
    (photo) => photo.species === normalizedSpecies,
  );
  const index = Math.floor(random() * photos.length);
  return photos[index] ?? photos[0];
}

export function getDemoCatalogPath(photo) {
  return `demo-catalog/${photo.id}.jpg`;
}

export function getDemoPetImagePath(prefix, petId, photo) {
  return `${prefix}/pets/${photo.id}/${petId}.jpg`;
}

export function formatDemoNeighborhoodLabel(neighborhood) {
  return `Near ${neighborhood.landmark}, ${neighborhood.address} (${neighborhood.neighborhood})`;
}
