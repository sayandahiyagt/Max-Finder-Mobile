// Add a separate, local-only batch of wide regional map demo activity.
// The batch uses existing Pet, Lost Pet Report, and Spotting records; it adds
// no schema or map API changes.

import { createHash } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import {
  DEMO_DULUTH_ANCHORS,
  DEMO_NEIGHBORHOODS,
  DEMO_PHOTOS,
  chooseDemoPhoto,
  formatDemoNeighborhoodLabel,
  getDemoCatalogPath,
  getDemoPetImagePath,
} from "./map-demo-content.mjs";
import { getLocalDatabaseUrl } from "./helpers/local-database-url.mjs";

const DEMO_MARKER = "[Map cluster demo]";
const DEMO_USER_EMAIL = "owner@example.test";
const DEFAULT_POINT_COUNT = 2000;
const MIN_POINT_COUNT = 100;
const MAX_POINT_COUNT = 3000;
const DEMO_ID_NAMESPACE = "southwide-2026-11-v2";
const MILES_PER_LATITUDE_DEGREE = 69;

const SOUTHERN_STATES = new Set([
  "AL", "AR", "FL", "GA", "KY", "LA", "MS", "NC", "OK", "SC", "TN", "TX", "VA", "WV",
]);
const WESTERN_STATES = new Set([
  "AZ", "CA", "CO", "ID", "NM", "NV", "OR", "UT", "WA",
]);
const NORTHEASTERN_STATES = new Set([
  "CT", "DC", "DE", "MA", "MD", "ME", "NH", "NJ", "NY", "PA", "RI", "VT",
]);
const SOUTHERN_CITIES = [
  { city: "Dallas, TX", state: "Texas", latitude: 32.7767, longitude: -96.7970 },
  { city: "Houston, TX", state: "Texas", latitude: 29.7604, longitude: -95.3698 },
  { city: "Austin, TX", state: "Texas", latitude: 30.2672, longitude: -97.7431 },
  { city: "Oklahoma City, OK", state: "Oklahoma", latitude: 35.4676, longitude: -97.5164 },
  { city: "Little Rock, AR", state: "Arkansas", latitude: 34.7465, longitude: -92.2896 },
  { city: "New Orleans, LA", state: "Louisiana", latitude: 29.9511, longitude: -90.0715 },
  { city: "Jackson, MS", state: "Mississippi", latitude: 32.2988, longitude: -90.1848 },
  { city: "Birmingham, AL", state: "Alabama", latitude: 33.5186, longitude: -86.8104 },
  { city: "Atlanta, GA", state: "Georgia", latitude: 33.7490, longitude: -84.3880 },
  { city: "Nashville, TN", state: "Tennessee", latitude: 36.1627, longitude: -86.7816 },
  { city: "Louisville, KY", state: "Kentucky", latitude: 38.2527, longitude: -85.7585 },
  { city: "Charlotte, NC", state: "North Carolina", latitude: 35.2271, longitude: -80.8431 },
  { city: "Charleston, SC", state: "South Carolina", latitude: 32.7765, longitude: -79.9311 },
  { city: "Richmond, VA", state: "Virginia", latitude: 37.5407, longitude: -77.4360 },
  { city: "Charleston, WV", state: "West Virginia", latitude: 38.3498, longitude: -81.6326 },
  { city: "Miami, FL", state: "Florida", latitude: 25.7617, longitude: -80.1918 },
];
const WESTERN_CITIES = [
  { city: "Portland, OR", state: "Oregon", latitude: 45.5152, longitude: -122.6784 },
  { city: "Boise, ID", state: "Idaho", latitude: 43.6150, longitude: -116.2023 },
  { city: "Las Vegas, NV", state: "Nevada", latitude: 36.1699, longitude: -115.1398 },
  { city: "Salt Lake City, UT", state: "Utah", latitude: 40.7608, longitude: -111.8910 },
  { city: "Albuquerque, NM", state: "New Mexico", latitude: 35.0844, longitude: -106.6504 },
];
const NORTHEASTERN_CITIES = [
  { city: "Philadelphia, PA", state: "Pennsylvania", latitude: 39.9526, longitude: -75.1652 },
  { city: "Baltimore, MD", state: "Maryland", latitude: 39.2904, longitude: -76.6122 },
  { city: "Pittsburgh, PA", state: "Pennsylvania", latitude: 40.4406, longitude: -79.9959 },
  { city: "Providence, RI", state: "Rhode Island", latitude: 41.8240, longitude: -71.4128 },
  { city: "Hartford, CT", state: "Connecticut", latitude: 41.7658, longitude: -72.6734 },
  { city: "Buffalo, NY", state: "New York", latitude: 42.8864, longitude: -78.8784 },
  { city: "Albany, NY", state: "New York", latitude: 42.6526, longitude: -73.7562 },
  { city: "Portland, ME", state: "Maine", latitude: 43.6591, longitude: -70.2568 },
];
const REGIONAL_LAND_CITIES = {
  south: [
    { city: "Birmingham, AL", state: "Alabama", latitude: 33.5186, longitude: -86.8104 },
    { city: "Montgomery, AL", state: "Alabama", latitude: 32.3668, longitude: -86.3000 },
    { city: "Little Rock, AR", state: "Arkansas", latitude: 34.7465, longitude: -92.2896 },
    { city: "Fayetteville, AR", state: "Arkansas", latitude: 36.0626, longitude: -94.1574 },
    { city: "Tampa, FL", state: "Florida", latitude: 27.9506, longitude: -82.4572 },
    { city: "Orlando, FL", state: "Florida", latitude: 28.5383, longitude: -81.3792 },
    { city: "Jacksonville, FL", state: "Florida", latitude: 30.3322, longitude: -81.6557 },
    { city: "Savannah, GA", state: "Georgia", latitude: 32.0809, longitude: -81.0912 },
    { city: "Macon, GA", state: "Georgia", latitude: 32.8407, longitude: -83.6324 },
    { city: "Augusta, GA", state: "Georgia", latitude: 33.4735, longitude: -82.0105 },
    { city: "Lexington, KY", state: "Kentucky", latitude: 38.0406, longitude: -84.5037 },
    { city: "Baton Rouge, LA", state: "Louisiana", latitude: 30.4515, longitude: -91.1871 },
    { city: "Shreveport, LA", state: "Louisiana", latitude: 32.5252, longitude: -93.7502 },
    { city: "Biloxi, MS", state: "Mississippi", latitude: 30.3960, longitude: -88.8853 },
    { city: "Greenville, MS", state: "Mississippi", latitude: 33.4101, longitude: -91.0618 },
    { city: "Asheville, NC", state: "North Carolina", latitude: 35.5951, longitude: -82.5515 },
    { city: "Wilmington, NC", state: "North Carolina", latitude: 34.2257, longitude: -77.9447 },
    { city: "Greenville, SC", state: "South Carolina", latitude: 34.8526, longitude: -82.3940 },
    { city: "Columbia, SC", state: "South Carolina", latitude: 34.0007, longitude: -81.0348 },
    { city: "Knoxville, TN", state: "Tennessee", latitude: 35.9606, longitude: -83.9207 },
    { city: "Memphis, TN", state: "Tennessee", latitude: 35.1495, longitude: -90.0490 },
    { city: "San Antonio, TX", state: "Texas", latitude: 29.4241, longitude: -98.4936 },
    { city: "El Paso, TX", state: "Texas", latitude: 31.7619, longitude: -106.4850 },
    { city: "Lubbock, TX", state: "Texas", latitude: 33.5779, longitude: -101.8552 },
    { city: "Corpus Christi, TX", state: "Texas", latitude: 27.8006, longitude: -97.3964 },
    { city: "Roanoke, VA", state: "Virginia", latitude: 37.2709, longitude: -79.9414 },
    { city: "Virginia Beach, VA", state: "Virginia", latitude: 36.8529, longitude: -75.9780 },
    { city: "Morgantown, WV", state: "West Virginia", latitude: 39.6295, longitude: -79.9559 },
    { city: "Mobile, AL", state: "Alabama", latitude: 30.6954, longitude: -88.0399 },
    { city: "Huntsville, AL", state: "Alabama", latitude: 34.7304, longitude: -86.5861 },
    { city: "Jonesboro, AR", state: "Arkansas", latitude: 35.8423, longitude: -90.7043 },
    { city: "Fort Smith, AR", state: "Arkansas", latitude: 35.3859, longitude: -94.3985 },
    { city: "Tallahassee, FL", state: "Florida", latitude: 30.4383, longitude: -84.2807 },
    { city: "Gainesville, FL", state: "Florida", latitude: 29.6516, longitude: -82.3248 },
    { city: "Pensacola, FL", state: "Florida", latitude: 30.4213, longitude: -87.2169 },
    { city: "Columbus, GA", state: "Georgia", latitude: 32.4610, longitude: -84.9877 },
    { city: "Athens, GA", state: "Georgia", latitude: 33.9519, longitude: -83.3576 },
    { city: "Bowling Green, KY", state: "Kentucky", latitude: 36.9903, longitude: -86.4436 },
    { city: "Paducah, KY", state: "Kentucky", latitude: 37.0834, longitude: -88.6000 },
    { city: "Lafayette, LA", state: "Louisiana", latitude: 30.2241, longitude: -92.0198 },
    { city: "Lake Charles, LA", state: "Louisiana", latitude: 30.2266, longitude: -93.2174 },
    { city: "Tupelo, MS", state: "Mississippi", latitude: 34.2576, longitude: -88.7034 },
    { city: "Hattiesburg, MS", state: "Mississippi", latitude: 31.3271, longitude: -89.2903 },
    { city: "Greensboro, NC", state: "North Carolina", latitude: 36.0726, longitude: -79.7920 },
    { city: "Raleigh, NC", state: "North Carolina", latitude: 35.7796, longitude: -78.6382 },
    { city: "Spartanburg, SC", state: "South Carolina", latitude: 34.9496, longitude: -81.9320 },
    { city: "Florence, SC", state: "South Carolina", latitude: 34.1954, longitude: -79.7626 },
    { city: "Chattanooga, TN", state: "Tennessee", latitude: 35.0456, longitude: -85.3097 },
    { city: "Jackson, TN", state: "Tennessee", latitude: 35.6145, longitude: -88.8139 },
    { city: "Amarillo, TX", state: "Texas", latitude: 35.2220, longitude: -101.8313 },
    { city: "Waco, TX", state: "Texas", latitude: 31.5493, longitude: -97.1467 },
    { city: "Midland, TX", state: "Texas", latitude: 31.9973, longitude: -102.0779 },
    { city: "Tyler, TX", state: "Texas", latitude: 32.3513, longitude: -95.3011 },
    { city: "Beaumont, TX", state: "Texas", latitude: 30.0802, longitude: -94.1266 },
    { city: "Lynchburg, VA", state: "Virginia", latitude: 37.4138, longitude: -79.1422 },
    { city: "Fredericksburg, VA", state: "Virginia", latitude: 38.3032, longitude: -77.4605 },
    { city: "Huntington, WV", state: "West Virginia", latitude: 38.4192, longitude: -82.4452 },
    { city: "Parkersburg, WV", state: "West Virginia", latitude: 39.2667, longitude: -81.5615 },
    { city: "Tulsa, OK", state: "Oklahoma", latitude: 36.1540, longitude: -95.9928 },
    { city: "Lawton, OK", state: "Oklahoma", latitude: 34.6036, longitude: -98.3959 },
    { city: "Tuscaloosa, AL", state: "Alabama", latitude: 33.2098, longitude: -87.5692 },
    { city: "Dothan, AL", state: "Alabama", latitude: 31.2232, longitude: -85.3905 },
    { city: "Conway, AR", state: "Arkansas", latitude: 35.0887, longitude: -92.4421 },
    { city: "Hot Springs, AR", state: "Arkansas", latitude: 34.5037, longitude: -93.0552 },
    { city: "Ocala, FL", state: "Florida", latitude: 29.1872, longitude: -82.1401 },
    { city: "Lakeland, FL", state: "Florida", latitude: 28.0395, longitude: -81.9498 },
    { city: "Warner Robins, GA", state: "Georgia", latitude: 32.6130, longitude: -83.6242 },
    { city: "Rome, GA", state: "Georgia", latitude: 34.2570, longitude: -85.1647 },
    { city: "Owensboro, KY", state: "Kentucky", latitude: 37.7719, longitude: -87.1112 },
    { city: "Frankfort, KY", state: "Kentucky", latitude: 38.2009, longitude: -84.8733 },
    { city: "Monroe, LA", state: "Louisiana", latitude: 32.5093, longitude: -92.1193 },
    { city: "Alexandria, LA", state: "Louisiana", latitude: 31.3113, longitude: -92.4451 },
    { city: "Meridian, MS", state: "Mississippi", latitude: 32.3643, longitude: -88.7037 },
    { city: "Oxford, MS", state: "Mississippi", latitude: 34.3665, longitude: -89.5192 },
    { city: "Fayetteville, NC", state: "North Carolina", latitude: 35.0527, longitude: -78.8784 },
    { city: "Hickory, NC", state: "North Carolina", latitude: 35.7345, longitude: -81.3445 },
    { city: "Muskogee, OK", state: "Oklahoma", latitude: 35.7479, longitude: -95.3697 },
    { city: "Enid, OK", state: "Oklahoma", latitude: 36.3956, longitude: -97.8784 },
    { city: "Rock Hill, SC", state: "South Carolina", latitude: 34.9249, longitude: -81.0251 },
    { city: "Aiken, SC", state: "South Carolina", latitude: 33.5604, longitude: -81.7196 },
    { city: "Clarksville, TN", state: "Tennessee", latitude: 36.5298, longitude: -87.3595 },
    { city: "Johnson City, TN", state: "Tennessee", latitude: 36.3134, longitude: -82.3535 },
    { city: "Abilene, TX", state: "Texas", latitude: 32.4487, longitude: -99.7331 },
    { city: "Laredo, TX", state: "Texas", latitude: 27.5306, longitude: -99.4803 },
    { city: "College Station, TX", state: "Texas", latitude: 30.6280, longitude: -96.3344 },
    { city: "Denton, TX", state: "Texas", latitude: 33.2148, longitude: -97.1331 },
    { city: "Harrisonburg, VA", state: "Virginia", latitude: 38.4496, longitude: -78.8689 },
    { city: "Danville, VA", state: "Virginia", latitude: 36.5859, longitude: -79.3950 },
    { city: "Beckley, WV", state: "West Virginia", latitude: 37.7782, longitude: -81.1882 },
    { city: "Wheeling, WV", state: "West Virginia", latitude: 40.0640, longitude: -80.7209 },
  ],
  west: [
    { city: "Tucson, AZ", state: "Arizona", latitude: 32.2226, longitude: -110.9747 },
    { city: "Flagstaff, AZ", state: "Arizona", latitude: 35.1983, longitude: -111.6513 },
    { city: "Sacramento, CA", state: "California", latitude: 38.5816, longitude: -121.4944 },
    { city: "Fresno, CA", state: "California", latitude: 36.7378, longitude: -119.7871 },
    { city: "Redding, CA", state: "California", latitude: 40.5865, longitude: -122.3917 },
    { city: "Colorado Springs, CO", state: "Colorado", latitude: 38.8339, longitude: -104.8214 },
    { city: "Grand Junction, CO", state: "Colorado", latitude: 39.0639, longitude: -108.5506 },
    { city: "Idaho Falls, ID", state: "Idaho", latitude: 43.4917, longitude: -112.0339 },
    { city: "Twin Falls, ID", state: "Idaho", latitude: 42.5629, longitude: -114.4609 },
    { city: "Las Cruces, NM", state: "New Mexico", latitude: 32.3199, longitude: -106.7637 },
    { city: "Santa Fe, NM", state: "New Mexico", latitude: 35.6870, longitude: -105.9378 },
    { city: "Reno, NV", state: "Nevada", latitude: 39.5296, longitude: -119.8138 },
    { city: "Eugene, OR", state: "Oregon", latitude: 44.0521, longitude: -123.0868 },
    { city: "Bend, OR", state: "Oregon", latitude: 44.0582, longitude: -121.3153 },
    { city: "St. George, UT", state: "Utah", latitude: 37.0965, longitude: -113.5684 },
    { city: "Provo, UT", state: "Utah", latitude: 40.2338, longitude: -111.6585 },
    { city: "Spokane, WA", state: "Washington", latitude: 47.6588, longitude: -117.4260 },
    { city: "Yakima, WA", state: "Washington", latitude: 46.6021, longitude: -120.5059 },
    { city: "Yuma, AZ", state: "Arizona", latitude: 32.6927, longitude: -114.6277 },
    { city: "Prescott, AZ", state: "Arizona", latitude: 34.5400, longitude: -112.4685 },
    { city: "Bakersfield, CA", state: "California", latitude: 35.3733, longitude: -119.0187 },
    { city: "San Jose, CA", state: "California", latitude: 37.3382, longitude: -121.8863 },
    { city: "Santa Rosa, CA", state: "California", latitude: 38.4404, longitude: -122.7141 },
    { city: "Pueblo, CO", state: "Colorado", latitude: 38.2544, longitude: -104.6091 },
    { city: "Fort Collins, CO", state: "Colorado", latitude: 40.5853, longitude: -105.0844 },
    { city: "Pocatello, ID", state: "Idaho", latitude: 42.8713, longitude: -112.4455 },
    { city: "Lewiston, ID", state: "Idaho", latitude: 46.4004, longitude: -117.0012 },
    { city: "Roswell, NM", state: "New Mexico", latitude: 33.3943, longitude: -104.5230 },
    { city: "Farmington, NM", state: "New Mexico", latitude: 36.7281, longitude: -108.2187 },
    { city: "Carson City, NV", state: "Nevada", latitude: 39.1638, longitude: -119.7674 },
    { city: "Elko, NV", state: "Nevada", latitude: 40.8324, longitude: -115.7631 },
    { city: "Salem, OR", state: "Oregon", latitude: 44.9429, longitude: -123.0351 },
    { city: "Medford, OR", state: "Oregon", latitude: 42.3265, longitude: -122.8756 },
    { city: "Logan, UT", state: "Utah", latitude: 41.7370, longitude: -111.8338 },
    { city: "Cedar City, UT", state: "Utah", latitude: 37.6775, longitude: -113.0619 },
    { city: "Bellingham, WA", state: "Washington", latitude: 48.7519, longitude: -122.4787 },
    { city: "Richland, WA", state: "Washington", latitude: 46.2857, longitude: -119.2845 },
    { city: "Kingman, AZ", state: "Arizona", latitude: 35.1894, longitude: -114.0530 },
    { city: "Sierra Vista, AZ", state: "Arizona", latitude: 31.5455, longitude: -110.2773 },
    { city: "Modesto, CA", state: "California", latitude: 37.6391, longitude: -120.9969 },
    { city: "Chico, CA", state: "California", latitude: 39.7285, longitude: -121.8375 },
    { city: "Greeley, CO", state: "Colorado", latitude: 40.4233, longitude: -104.7091 },
    { city: "Durango, CO", state: "Colorado", latitude: 37.2753, longitude: -107.8801 },
    { city: "Caldwell, ID", state: "Idaho", latitude: 43.6629, longitude: -116.6874 },
    { city: "Coeur d'Alene, ID", state: "Idaho", latitude: 47.6777, longitude: -116.7805 },
    { city: "Clovis, NM", state: "New Mexico", latitude: 34.4048, longitude: -103.2052 },
    { city: "Gallup, NM", state: "New Mexico", latitude: 35.5281, longitude: -108.7426 },
    { city: "Mesquite, NV", state: "Nevada", latitude: 36.8055, longitude: -114.0672 },
    { city: "Winnemucca, NV", state: "Nevada", latitude: 40.9729, longitude: -117.7357 },
    { city: "Corvallis, OR", state: "Oregon", latitude: 44.5646, longitude: -123.2620 },
    { city: "Grants Pass, OR", state: "Oregon", latitude: 42.4390, longitude: -123.3284 },
    { city: "Ogden, UT", state: "Utah", latitude: 41.2230, longitude: -111.9738 },
    { city: "Price, UT", state: "Utah", latitude: 39.5994, longitude: -110.8107 },
    { city: "Wenatchee, WA", state: "Washington", latitude: 47.4235, longitude: -120.3103 },
    { city: "Walla Walla, WA", state: "Washington", latitude: 46.0646, longitude: -118.3430 },
  ],
  northeast: [
    { city: "Newark, DE", state: "Delaware", latitude: 39.6837, longitude: -75.7497 },
    { city: "Wilmington, DE", state: "Delaware", latitude: 39.7391, longitude: -75.5398 },
    { city: "Burlington, VT", state: "Vermont", latitude: 44.4759, longitude: -73.2121 },
    { city: "Manchester, NH", state: "New Hampshire", latitude: 42.9956, longitude: -71.4548 },
    { city: "Newark, NJ", state: "New Jersey", latitude: 40.7357, longitude: -74.1724 },
    { city: "Trenton, NJ", state: "New Jersey", latitude: 40.2171, longitude: -74.7429 },
    { city: "Syracuse, NY", state: "New York", latitude: 43.0481, longitude: -76.1474 },
    { city: "Rochester, NY", state: "New York", latitude: 43.1566, longitude: -77.6088 },
    { city: "Erie, PA", state: "Pennsylvania", latitude: 42.1292, longitude: -80.0851 },
    { city: "Scranton, PA", state: "Pennsylvania", latitude: 41.4089, longitude: -75.6624 },
    { city: "Worcester, MA", state: "Massachusetts", latitude: 42.2626, longitude: -71.8023 },
    { city: "Springfield, MA", state: "Massachusetts", latitude: 42.1015, longitude: -72.5898 },
    { city: "Bangor, ME", state: "Maine", latitude: 44.8012, longitude: -68.7778 },
    { city: "Montpelier, VT", state: "Vermont", latitude: 44.2601, longitude: -72.5754 },
    { city: "Concord, NH", state: "New Hampshire", latitude: 43.2081, longitude: -71.5376 },
    { city: "Atlantic City, NJ", state: "New Jersey", latitude: 39.3643, longitude: -74.4229 },
    { city: "Ithaca, NY", state: "New York", latitude: 42.4430, longitude: -76.5019 },
    { city: "Binghamton, NY", state: "New York", latitude: 42.0987, longitude: -75.9180 },
    { city: "Harrisburg, PA", state: "Pennsylvania", latitude: 40.2732, longitude: -76.8867 },
    { city: "State College, PA", state: "Pennsylvania", latitude: 40.7934, longitude: -77.8600 },
    { city: "Lowell, MA", state: "Massachusetts", latitude: 42.6334, longitude: -71.3162 },
    { city: "Pittsfield, MA", state: "Massachusetts", latitude: 42.4501, longitude: -73.2454 },
    { city: "New Haven, CT", state: "Connecticut", latitude: 41.3083, longitude: -72.9279 },
    { city: "Stamford, CT", state: "Connecticut", latitude: 41.0534, longitude: -73.5387 },
    { city: "Woonsocket, RI", state: "Rhode Island", latitude: 42.0029, longitude: -71.5148 },
    { city: "Dover, DE", state: "Delaware", latitude: 39.1582, longitude: -75.5244 },
    { city: "Frederick, MD", state: "Maryland", latitude: 39.4143, longitude: -77.4105 },
    { city: "Hagerstown, MD", state: "Maryland", latitude: 39.6418, longitude: -77.7199 },
    { city: "Augusta, ME", state: "Maine", latitude: 44.3106, longitude: -69.7795 },
    { city: "Rutland, VT", state: "Vermont", latitude: 43.6106, longitude: -72.9726 },
    { city: "Keene, NH", state: "New Hampshire", latitude: 42.9337, longitude: -72.2781 },
    { city: "Edison, NJ", state: "New Jersey", latitude: 40.5187, longitude: -74.4121 },
    { city: "Utica, NY", state: "New York", latitude: 43.1009, longitude: -75.2327 },
    { city: "Watertown, NY", state: "New York", latitude: 43.9748, longitude: -75.9108 },
    { city: "Altoona, PA", state: "Pennsylvania", latitude: 40.5187, longitude: -78.3947 },
    { city: "Reading, PA", state: "Pennsylvania", latitude: 40.3356, longitude: -75.9269 },
    { city: "Amherst, MA", state: "Massachusetts", latitude: 42.3732, longitude: -72.5199 },
    { city: "Middletown, CT", state: "Connecticut", latitude: 41.5623, longitude: -72.6506 },
    { city: "Cumberland, MD", state: "Maryland", latitude: 39.6529, longitude: -78.7625 },
    { city: "Georgetown, DE", state: "Delaware", latitude: 38.6901, longitude: -75.3855 },
  ],
};
const REGION_ORDER = ["south", "west", "northeast"];
const STATE_CENTERS = {
  AL: [32.8067, -86.7911], AR: [34.9697, -92.3731], AZ: [34.0489, -111.0937],
  CA: [36.7783, -119.4179], CO: [39.5501, -105.7821], CT: [41.6032, -73.0877],
  DE: [38.9108, -75.5277], FL: [27.6648, -81.5158], GA: [32.1656, -82.9001],
  ID: [44.0682, -114.7420], KY: [37.8393, -84.2700], LA: [30.9843, -91.9623],
  MA: [42.4072, -71.3824], MD: [39.0458, -76.6413], ME: [45.2538, -69.4455],
  MS: [32.3547, -89.3985], NH: [43.1939, -71.5724], NJ: [40.0583, -74.4057],
  NM: [34.5199, -105.8701], NV: [38.8026, -116.4194], NY: [43.0000, -75.0000],
  NC: [35.7596, -79.0193], OK: [35.4676, -97.5164], OR: [43.8041, -120.5542],
  PA: [41.2033, -77.1945], RI: [41.5801, -71.4774], SC: [33.8361, -81.1637],
  TN: [35.5175, -86.5804], TX: [31.9686, -99.9018], UT: [39.3210, -111.0937],
  VT: [44.0000, -72.7000], VA: [37.4316, -78.6569], WA: [47.7511, -120.7401],
  WV: [38.5976, -80.4549],
};
const RED_CLUSTER_CITY_BY_STATE = {
  AL: "Birmingham, AL",
  AR: "Little Rock, AR",
  AZ: "Flagstaff, AZ",
  CA: "Fresno, CA",
  CO: "Colorado Springs, CO",
  CT: "Hartford, CT",
  DE: "Dover, DE",
  FL: "Orlando, FL",
  GA: "Macon, GA",
  ID: "Idaho Falls, ID",
  KY: "Lexington, KY",
  LA: "Alexandria, LA",
  MA: "Worcester, MA",
  MD: "Frederick, MD",
  ME: "Augusta, ME",
  MS: "Jackson, MS",
  NH: "Concord, NH",
  NJ: "Trenton, NJ",
  NM: "Santa Fe, NM",
  NV: "Elko, NV",
  NY: "Albany, NY",
  NC: "Greensboro, NC",
  OK: "Tulsa, OK",
  OR: "Bend, OR",
  PA: "Harrisburg, PA",
  RI: "Woonsocket, RI",
  SC: "Columbia, SC",
  TN: "Knoxville, TN",
  TX: "Lubbock, TX",
  UT: "Provo, UT",
  VT: "Montpelier, VT",
  VA: "Roanoke, VA",
  WA: "Yakima, WA",
  WV: "Beckley, WV",
};
const BLUE_CLUSTER_CITY_BY_STATE = {
  AL: "Mobile, AL",
  AR: "Fayetteville, AR",
  AZ: "Tucson, AZ",
  CA: "Sacramento, CA",
  CO: "Grand Junction, CO",
  CT: "Stamford, CT",
  DE: "Newark, DE",
  FL: "Jacksonville, FL",
  GA: "Savannah, GA",
  ID: "Boise, ID",
  KY: "Paducah, KY",
  LA: "New Orleans, LA",
  MA: "Pittsfield, MA",
  MD: "Cumberland, MD",
  ME: "Bangor, ME",
  MS: "Tupelo, MS",
  NH: "Keene, NH",
  NJ: "Newark, NJ",
  NM: "Las Cruces, NM",
  NV: "Las Vegas, NV",
  NY: "Buffalo, NY",
  NC: "Wilmington, NC",
  OK: "Lawton, OK",
  OR: "Portland, OR",
  PA: "Erie, PA",
  RI: "Providence, RI",
  SC: "Greenville, SC",
  TN: "Memphis, TN",
  TX: "El Paso, TX",
  UT: "St. George, UT",
  VT: "Burlington, VT",
  VA: "Virginia Beach, VA",
  WA: "Spokane, WA",
  WV: "Wheeling, WV",
};

const petNames = [
  "Maple", "Scout", "Poppy", "Milo", "Juniper", "Clover", "Ollie", "Pepper",
  "Sunny", "Waffles", "Mochi", "Ranger", "Miso", "Comet", "Willow", "Pip",
];
const dogBreeds = [
  "Labrador Retriever", "German Shepherd", "Golden Retriever", "Beagle",
  "Poodle", "Corgi", "Boxer", "Dachshund",
];
const catBreeds = [
  "Domestic Shorthair", "Siamese", "Maine Coon", "Persian", "Ragdoll",
  "Bengal", "British Shorthair", "Abyssinian",
];
const colors = ["Black", "Brown", "White", "Golden", "Gray", "Orange", "Tan"];
const sizes = ["small", "medium", "large"];
const weightRanges = [
  "Under 10 lbs", "10–25 lbs", "26–50 lbs", "51–75 lbs", "Over 75 lbs",
];

function parseOptions(args) {
  let pointsValue = process.env.MAXFINDER_MAP_CLUSTER_POINTS ?? DEFAULT_POINT_COUNT;
  let dryRun = false;
  let json = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (argument === "--json") {
      json = true;
      continue;
    }
    if (argument === "--points") {
      pointsValue = args[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`Unknown option '${argument}'. Use --points N and/or --dry-run.`);
  }

  const points = Number(pointsValue);
  if (
    !Number.isInteger(points) ||
    points < MIN_POINT_COUNT ||
    points > MAX_POINT_COUNT
  ) {
    throw new Error(
      `Point count must be a whole number from ${MIN_POINT_COUNT} to ${MAX_POINT_COUNT}.`,
    );
  }

  return { points, dryRun, json };
}

// Small deterministic random generator: every run lays out the same demo map.
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, values) {
  return values[Math.floor(random() * values.length)] ?? values[0];
}

// Stable IDs keep the same synthetic records recognizable between versions.
function demoId(key) {
  const bytes = createHash("sha1")
    .update(`${DEMO_ID_NAMESPACE}:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function roundCoordinate(value) {
  return Number(value.toFixed(6));
}

// Southern hubs stretch the red and blue layers across state lines at U.S. zoom.
function buildClusterHubs() {
  const allAnchors = [...DEMO_NEIGHBORHOODS, ...DEMO_DULUTH_ANCHORS];
  const stateCode = (place) => place.city.split(", ").at(-1);
  const cityHubs = (cities, region) => cities
    .filter((city) => !allAnchors.some((place) => place.city === city.city))
    .map((city) => ({
      ...city,
      neighborhood: `${city.state} city center`,
      landmark: `${city.city} city center`,
      address: city.city,
      region,
    }));
  const neighborhoodHubs = allAnchors.flatMap((place) => {
    const code = stateCode(place);
    const region = SOUTHERN_STATES.has(code)
      ? "south"
      : WESTERN_STATES.has(code)
        ? "west"
        : NORTHEASTERN_STATES.has(code)
          ? "northeast"
          : null;
    return region ? [{ ...place, region }] : [];
  });
  return [
    ...neighborhoodHubs,
    ...cityHubs(SOUTHERN_CITIES, "south"),
    ...cityHubs(WESTERN_CITIES, "west"),
    ...cityHubs(NORTHEASTERN_CITIES, "northeast"),
    ...REGION_ORDER.flatMap((region) =>
      REGIONAL_LAND_CITIES[region].map((place) => ({
        ...place,
        neighborhood: `${place.state} regional city`,
        landmark: `${place.city} civic center`,
        address: `${place.city} civic center`,
        region,
      })),
    ),
  ];
}

function createPointPosition(hub, index, pointCount) {
  // Keep unique points close to a curated city anchor and bias them toward the
  // state's interior so coastal locations do not drift offshore.
  const stateCode = hub.city.split(", ").at(-1);
  const stateCenter = STATE_CENTERS[stateCode];
  const northwardMiles = stateCenter
    ? (stateCenter[0] - hub.latitude) * MILES_PER_LATITUDE_DEGREE
    : 1;
  const eastwardMiles = stateCenter
    ? (stateCenter[1] - hub.longitude) * MILES_PER_LATITUDE_DEGREE *
      Math.cos((hub.latitude * Math.PI) / 180)
    : 0;
  const inwardBearing = Math.atan2(northwardMiles, eastwardMiles);
  const longitudeScale = Math.max(
    Math.cos((hub.latitude * Math.PI) / 180),
    0.3,
  );
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const sequence = index * 1000 + attempt;
    const radiusMiles = 0.2 + (sequence % 24) * 0.065;
    const angularFraction = (sequence * 0.618033988749895) % 1;
    const angularSpread = (angularFraction - 0.5) * (Math.PI * 0.7);
    const angle = inwardBearing + angularSpread;
    const latitudeOffset =
      (Math.sin(angle) * radiusMiles) / MILES_PER_LATITUDE_DEGREE;
    const longitudeOffset =
      (Math.cos(angle) * radiusMiles) /
      (MILES_PER_LATITUDE_DEGREE * longitudeScale);
    const coordinate = {
      latitude: roundCoordinate(hub.latitude + latitudeOffset),
      longitude: roundCoordinate(hub.longitude + longitudeOffset),
    };
    const key = `${coordinate.latitude},${coordinate.longitude}`;
    if (!pointCount.has(key)) {
      pointCount.add(key);
      return coordinate;
    }
  }
  throw new Error("Could not generate a distinct demo coordinate for a land anchor.");
}

function createTimestamp(random, daysBack) {
  const millisecondsPerDay = 86_400_000;
  return new Date(Date.now() - Math.floor(random() * daysBack * millisecondsPerDay));
}

function getHubSpacingRange(hubs, cities) {
  const spacings = [];
  for (const city of cities) {
    const cityHubs = hubs.filter((hub) => hub.city === city);
    for (let first = 0; first < cityHubs.length; first += 1) {
      for (let second = first + 1; second < cityHubs.length; second += 1) {
        const firstHub = cityHubs[first];
        const secondHub = cityHubs[second];
        if (!firstHub || !secondHub) continue;
        const meanLatitude =
          ((firstHub.latitude + secondHub.latitude) / 2) * (Math.PI / 180);
        const northSouthMiles =
          (secondHub.latitude - firstHub.latitude) * MILES_PER_LATITUDE_DEGREE;
        const eastWestMiles =
          (secondHub.longitude - firstHub.longitude) *
          MILES_PER_LATITUDE_DEGREE *
          Math.cos(meanLatitude);
        const spacing = Math.hypot(northSouthMiles, eastWestMiles);
        if (spacing > 0) spacings.push(spacing);
      }
    }
  }

  return {
    minimum: Math.min(...spacings),
    maximum: Math.max(...spacings),
  };
}

function getDistanceMiles(first, second) {
  const meanLatitude = ((first.latitude + second.latitude) / 2) * (Math.PI / 180);
  const northSouthMiles = (second.latitude - first.latitude) * MILES_PER_LATITUDE_DEGREE;
  const eastWestMiles =
    (second.longitude - first.longitude) *
    MILES_PER_LATITUDE_DEGREE *
    Math.cos(meanLatitude);
  return Math.hypot(northSouthMiles, eastWestMiles);
}

function buildDataset(pointCount) {
  const random = createRandom(20261111);
  const hubs = buildClusterHubs();
  const hubsByRegion = Object.fromEntries(
    REGION_ORDER.map((region) => [region, hubs.filter((hub) => hub.region === region)]),
  );
  const makeStateBalancedSchedule = (
    regionHubs,
    count,
    { activityOffset = 0, mode = "all" } = {},
  ) => {
    const byState = new Map();
    for (const hub of regionHubs) {
      const state = hub.city.split(", ").at(-1);
      const stateHubs = byState.get(state) ?? [];
      stateHubs.push(hub);
      byState.set(state, stateHubs);
    }
    const allStates = [...byState.keys()].sort();
    const stateLocations = new Map();
    const statePositions = new Map();
    for (const state of allStates) {
      const uniqueLocations = [...new Map(
        (byState.get(state) ?? []).map((hub) => [hub.city, hub]),
      ).values()];
      const redCity = RED_CLUSTER_CITY_BY_STATE[state];
      const blueCity = BLUE_CLUSTER_CITY_BY_STATE[state];
      const redLocation = uniqueLocations.find((hub) => hub.city === redCity);
      const blueLocation = uniqueLocations.find((hub) => hub.city === blueCity);
      let locations = uniqueLocations;
      if (mode === "red-only") locations = redLocation ? [redLocation] : [];
      if (mode === "blue-only") locations = blueLocation ? [blueLocation] : [];
      if (mode === "without-clusters") {
        locations = uniqueLocations.filter(
          (hub) => hub.city !== redCity && hub.city !== blueCity,
        );
      }
      stateLocations.set(state, locations);
      statePositions.set(
        state,
        activityOffset === 0 ? 0 : Math.floor(locations.length / 2),
      );
    }
    const states = allStates.filter((state) => (stateLocations.get(state)?.length ?? 0) > 0);
    const schedule = [];
    for (let index = 0; index < count; index += 1) {
      const state = states[index % states.length];
      const stateHubs = stateLocations.get(state) ?? [];
      const position = statePositions.get(state) ?? 0;
      const hub = stateHubs.length
        ? stateHubs[position % stateHubs.length]
        : undefined;
      if (!hub) throw new Error(`No curated land anchor available for ${state}.`);
      schedule.push(hub);
      statePositions.set(state, position + 1);
    }
    return schedule;
  };
  const cities = [...new Set(hubs.map((hub) => hub.city))];
  const lostCount = Math.ceil(pointCount / 2);
  const spottingCount = pointCount - lostCount;
  const pets = [];
  const petImages = [];
  const reports = [];
  const spottings = [];
  const usedCoordinates = new Set();

  const regionalCounts = {
    south: Math.round(pointCount * 0.7),
    west: Math.floor(pointCount * 0.15),
    northeast: pointCount - Math.round(pointCount * 0.7) - Math.floor(pointCount * 0.15),
  };

  // Keep both activity types evenly distributed through each region.
  const lostRegionalCounts = {
    south: Math.round(lostCount * 0.7),
    west: Math.floor(lostCount * 0.15),
    northeast: lostCount - Math.round(lostCount * 0.7) - Math.floor(lostCount * 0.15),
  };
  const spottingRegionalCounts = {
    south: Math.round(spottingCount * 0.7),
    west: Math.floor(spottingCount * 0.15),
    northeast: spottingCount - Math.round(spottingCount * 0.7) - Math.floor(spottingCount * 0.15),
  };
  const redOnlyLostCounts = Object.fromEntries(
    REGION_ORDER.map((region) => [region, Math.floor(lostRegionalCounts[region] / 2)]),
  );
  const blueOnlySpottingCounts = Object.fromEntries(
    REGION_ORDER.map((region) => [region, Math.floor(spottingRegionalCounts[region] / 2)]),
  );
  const lostRegularPositions = Object.fromEntries(REGION_ORDER.map((region) => [region, 0]));
  const redOnlyPositions = Object.fromEntries(REGION_ORDER.map((region) => [region, 0]));
  const lostSchedules = Object.fromEntries(
    REGION_ORDER.map((region) => [
      region,
      makeStateBalancedSchedule(
        hubsByRegion[region] ?? [],
        lostRegionalCounts[region] - redOnlyLostCounts[region],
        {
        mode: "without-clusters",
        activityOffset: 1,
        },
      ),
    ]),
  );
  const redOnlySchedules = Object.fromEntries(
    REGION_ORDER.map((region) => [
      region,
      makeStateBalancedSchedule(hubsByRegion[region] ?? [], redOnlyLostCounts[region], {
        mode: "red-only",
      }),
    ]),
  );
  const blueOnlySchedules = Object.fromEntries(
    REGION_ORDER.map((region) => [
      region,
      makeStateBalancedSchedule(hubsByRegion[region] ?? [], blueOnlySpottingCounts[region], {
        mode: "blue-only",
      }),
    ]),
  );
  for (const [region, regionCount] of Object.entries(lostRegionalCounts)) {
    for (let localIndex = 0; localIndex < regionCount; localIndex += 1) {
      const index = reports.length;
      const isRedOnlyPoint = localIndex % 2 === 0 &&
        redOnlyPositions[region] < redOnlyLostCounts[region];
      const hub = isRedOnlyPoint
        ? redOnlySchedules[region][redOnlyPositions[region]++]
        : lostSchedules[region][lostRegularPositions[region]++];
      if (!hub) continue;
      const isDog = random() < 0.55;
      const species = isDog ? "dog" : "cat";
      const breed = pick(random, isDog ? dogBreeds : catBreeds);
      const petId = demoId(`pet-${index}`);
      const position = createPointPosition(hub, index, usedCoordinates);
      const photo = chooseDemoPhoto(random, species);
      pets.push({
        id: petId,
        ownerId: null,
        name: pick(random, petNames),
        species,
        breed,
        color: pick(random, colors),
        size: pick(random, sizes),
        age: 1 + Math.floor(random() * 15),
        description: `${DEMO_MARKER} Demo pet near ${hub.neighborhood}, ${hub.city}`,
      });
      petImages.push({
        petId,
        storagePath: getDemoPetImagePath("demo-clusters", petId, photo),
        caption: `Synthetic ${species} photo: ${photo.id}`,
      });
      reports.push({
        id: demoId(`report-${region}-${localIndex}`),
        petId,
        status: "LOST",
        lastSeenAt: createTimestamp(random, 60),
        contactMethod: "in_app",
        latitude: position.latitude,
        longitude: position.longitude,
        weightRange: pick(random, weightRanges),
        description: `${DEMO_MARKER} Lost ${species} near ${hub.landmark} in ${hub.neighborhood}, ${hub.city}`,
        locationLabel: formatDemoNeighborhoodLabel(hub),
      });
    }
  }

  const spottingRegionPositions = Object.fromEntries(REGION_ORDER.map((region) => [region, 0]));
  const spottingRegularPositions = Object.fromEntries(REGION_ORDER.map((region) => [region, 0]));
  const blueOnlyPositions = Object.fromEntries(REGION_ORDER.map((region) => [region, 0]));
  const spottingSchedules = Object.fromEntries(
    REGION_ORDER.map((region) => [
      region,
      makeStateBalancedSchedule(
        hubsByRegion[region] ?? [],
        spottingRegionalCounts[region] - blueOnlySpottingCounts[region],
        { activityOffset: 1, mode: "without-clusters" },
      ),
    ]),
  );
  for (const [region, regionCount] of Object.entries(spottingRegionalCounts)) {
    for (let localIndex = 0; localIndex < regionCount; localIndex += 1) {
      const isBlueOnlyPoint = localIndex % 2 === 0 &&
        blueOnlyPositions[region] < blueOnlySpottingCounts[region];
      const hub = isBlueOnlyPoint
        ? blueOnlySchedules[region][blueOnlyPositions[region]++]
        : spottingSchedules[region][spottingRegularPositions[region]++];
      spottingRegionPositions[region] += 1;
      if (!hub) continue;
      const isDog = random() < 0.55;
      const species = isDog ? "Dog" : "Cat";
      const position = createPointPosition(hub, lostCount + localIndex, usedCoordinates);
      const photo = chooseDemoPhoto(random, species);
      spottings.push({
        id: demoId(`spotting-${region}-${localIndex}`),
        species,
        breed: pick(random, isDog ? dogBreeds : catBreeds),
        weightRange: pick(random, weightRanges),
        description: `${DEMO_MARKER} Spotted a ${species.toLowerCase()} near ${hub.landmark} in ${hub.neighborhood}, ${hub.city}`,
        spottedAt: createTimestamp(random, 30),
        latitude: position.latitude,
        longitude: position.longitude,
        locationLabel: formatDemoNeighborhoodLabel(hub),
        imagePath: getDemoCatalogPath(photo),
      });
    }
  }

  const statesByRegion = Object.fromEntries(
    REGION_ORDER.map((region) => [
      region,
      [...new Set(
        hubs
          .filter((hub) => hub.region === region)
          .map((hub) => hub.city.split(", ").at(-1)),
      )].sort(),
    ]),
  );
  const countByState = (records) => {
    const counts = {};
    for (const record of records) {
      const state = record.locationLabel.match(/, ([A-Z]{2})\b/)?.[1];
      if (state) counts[state] = (counts[state] ?? 0) + 1;
    }
    return counts;
  };
  const stateActivityCounts = (lost, spotted) => {
    const lostCounts = countByState(lost);
    const spottingCounts = countByState(spotted);
    return Object.fromEntries(
      [...new Set([...Object.keys(lostCounts), ...Object.keys(spottingCounts)])]
        .sort()
        .map((state) => [state, {
          lostReports: lostCounts[state] ?? 0,
          spottings: spottingCounts[state] ?? 0,
        }]),
    );
  };
  const pointsByState = {
    south: stateActivityCounts(
      reports.slice(0, lostRegionalCounts.south),
      spottings.slice(0, spottingRegionalCounts.south),
    ),
    west: stateActivityCounts(
      reports.slice(lostRegionalCounts.south, lostRegionalCounts.south + lostRegionalCounts.west),
      spottings.slice(spottingRegionalCounts.south, spottingRegionalCounts.south + spottingRegionalCounts.west),
    ),
    northeast: stateActivityCounts(
      reports.slice(lostRegionalCounts.south + lostRegionalCounts.west),
      spottings.slice(spottingRegionalCounts.south + spottingRegionalCounts.west),
    ),
  };
  const redOnlyCitiesByRegion = Object.fromEntries(
    REGION_ORDER.map((region) => [
      region,
      [...new Set(redOnlySchedules[region].map((hub) => hub.city))].sort(),
    ]),
  );
  const redOnlyClustersByRegion = Object.fromEntries(
    REGION_ORDER.map((region) => [
      region,
      Object.fromEntries(
        redOnlyCitiesByRegion[region].map((city) => [city, {
          lostReports: reports.filter((report) => report.description.includes(city)).length,
          spottings: spottings.filter((spotting) => spotting.description.includes(city)).length,
        }]),
      ),
    ]),
  );
  const blueOnlyCitiesByRegion = Object.fromEntries(
    REGION_ORDER.map((region) => [
      region,
      [...new Set(blueOnlySchedules[region].map((hub) => hub.city))].sort(),
    ]),
  );
  const blueOnlyClustersByRegion = Object.fromEntries(
    REGION_ORDER.map((region) => [
      region,
      Object.fromEntries(
        blueOnlyCitiesByRegion[region].map((city) => [city, {
          lostReports: reports.filter((report) => report.description.includes(city)).length,
          spottings: spottings.filter((spotting) => spotting.description.includes(city)).length,
        }]),
      ),
    ]),
  );
  const redBlueClusterDistancesMilesByState = {};
  for (const region of REGION_ORDER) {
    const redByState = new Map(
      [...new Map(redOnlySchedules[region].map((hub) => [hub.city, hub])).values()]
        .map((hub) => [hub.city.split(", ").at(-1), hub]),
    );
    const blueByState = new Map(
      [...new Map(blueOnlySchedules[region].map((hub) => [hub.city, hub])).values()]
        .map((hub) => [hub.city.split(", ").at(-1), hub]),
    );
    for (const [state, redHub] of redByState) {
      const blueHub = blueByState.get(state);
      if (blueHub) {
        redBlueClusterDistancesMilesByState[state] = Number(
          getDistanceMiles(redHub, blueHub).toFixed(1),
        );
      }
    }
  }
  return {
    hubs,
    cities,
    regionalCounts,
    lostRegionalCounts,
    spottingRegionalCounts,
    statesByRegion,
    locationsByState: Object.fromEntries(
      REGION_ORDER.map((region) => [
        region,
        Object.fromEntries(
          Object.entries(
            hubs
              .filter((hub) => hub.region === region)
              .reduce((byState, hub) => {
                const state = hub.city.split(", ").at(-1);
                byState[state] ??= new Set();
                byState[state].add(hub.city);
                return byState;
              }, {}),
          ).map(([state, citySet]) => [state, citySet.size]),
        ),
      ]),
    ),
    pointsByState,
    redOnlyClustersByRegion,
    blueOnlyClustersByRegion,
    redBlueClusterDistancesMilesByState,
    uniquePointCoordinates: usedCoordinates.size,
    pets,
    petImages,
    reports,
    spottings,
  };
}

function printDryRun(pointCount, dataset, json) {
  const spacing = getHubSpacingRange(dataset.hubs, dataset.cities);
  const summary = {
    totalPoints: pointCount,
    lostReports: dataset.reports.length,
    spottings: dataset.spottings.length,
    cities: dataset.cities.length,
    clusterCenters: dataset.hubs.length,
    neighborhoodAnchors: dataset.hubs.length,
    regionalCounts: dataset.regionalCounts,
    statesByRegion: dataset.statesByRegion,
    locationsByState: dataset.locationsByState,
    pointsByState: dataset.pointsByState,
    redOnlyClustersByRegion: dataset.redOnlyClustersByRegion,
    blueOnlyClustersByRegion: dataset.blueOnlyClustersByRegion,
    redBlueClusterDistancesMilesByState: dataset.redBlueClusterDistancesMilesByState,
    regionHubCounts: Object.fromEntries(
      REGION_ORDER.map((region) => [
        region,
        dataset.hubs.filter((hub) => hub.region === region).length,
      ]),
    ),
    redBlueCountsByRegion: Object.fromEntries(
      REGION_ORDER.map((region) => [region, {
        lostReports: dataset.lostRegionalCounts[region],
        spottings: dataset.spottingRegionalCounts[region],
      }]),
    ),
    uniqueAnchorCoordinates: new Set(
      dataset.hubs.map((hub) => `${hub.latitude},${hub.longitude}`),
    ).size,
    uniquePointCoordinates: dataset.uniquePointCoordinates,
    petPhotoVariants: DEMO_PHOTOS.length,
    clusterCenterSpacingMiles: {
      minimum: Number(spacing.minimum.toFixed(1)),
      maximum: Number(spacing.maximum.toFixed(1)),
    },
    pointSpread: `${dataset.uniquePointCoordinates} distinct coordinates around curated locations in multiple states; every activity remains an individual red or blue dot`,
  };

  process.stdout.write(
    json
      ? `${JSON.stringify(summary, null, 2)}\n`
      : `Dry run: ${summary.totalPoints} points (${summary.lostReports} lost reports, ` +
          `${summary.spottings} spottings) across ${summary.cities} cities and ` +
          `${summary.clusterCenters} neighborhood anchors. Regional split: ` +
          `${summary.regionalCounts.south} South, ${summary.regionalCounts.west} West, ` +
          `${summary.regionalCounts.northeast} Northeast. States: ` +
          `${REGION_ORDER.map((region) => `${region} ${summary.statesByRegion[region].join(", ")}`).join("; ")}. ` +
          `Centers are ${summary.clusterCenterSpacingMiles.minimum}–` +
          `${summary.clusterCenterSpacingMiles.maximum} miles apart; ` +
          `${summary.uniqueAnchorCoordinates} land anchors and ` +
          `${summary.uniquePointCoordinates} unique point coordinates.\n`,
  );
}

async function clearPreviousBatch(prisma) {
  return prisma.$transaction(async (transaction) => {
    const pets = await transaction.pet.findMany({
      where: { description: { startsWith: DEMO_MARKER } },
      select: { id: true },
    });
    const petIds = pets.map((pet) => pet.id);
    const reports = await transaction.lostPetReport.deleteMany({
      where: { description: { startsWith: DEMO_MARKER } },
    });
    const spottings = await transaction.spotting.deleteMany({
      where: { description: { startsWith: DEMO_MARKER } },
    });
    const petImages = petIds.length
      ? await transaction.petImage.deleteMany({ where: { petId: { in: petIds } } })
      : { count: 0 };
    const deletedPets = petIds.length
      ? await transaction.pet.deleteMany({ where: { id: { in: petIds } } })
      : { count: 0 };
    return {
      reports: reports.count,
      spottings: spottings.count,
      pets: deletedPets.count,
      petImages: petImages.count,
    };
  });
}

async function insertGeneratedBatch(prisma, dataset, ownerId) {
  const pets = dataset.pets.map((pet) => ({ ...pet, ownerId }));
  const insertedPets = await prisma.pet.createMany({
    data: pets,
  });
  const insertedPetImages = await prisma.petImage.createMany({
    data: dataset.petImages,
  });
  const insertedReports = await prisma.lostPetReport.createMany({
    data: dataset.reports,
  });
  const insertedSpottings = await prisma.spotting.createMany({
    data: dataset.spottings,
  });
  return {
    pets: insertedPets.count,
    petImages: insertedPetImages.count,
    reports: insertedReports.count,
    spottings: insertedSpottings.count,
  };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  // Generate before connecting so dry runs never touch PostgreSQL.
  const dataset = buildDataset(options.points);

  if (options.dryRun) {
    printDryRun(options.points, dataset, options.json);
    return;
  }

  process.stdout.write("Connecting to local Supabase PostgreSQL...\n");
  const databaseUrl = getLocalDatabaseUrl();
  const pool = new pg.Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const owner = await prisma.user.findUnique({
      where: { email: DEMO_USER_EMAIL },
      select: { userId: true },
    });
    if (!owner) {
      throw new Error("Run `npm run db:reset` first so the local demo owner exists.");
    }

    const removed = await clearPreviousBatch(prisma);
    process.stdout.write(
      `Replaced ${removed.reports} old lost reports and ${removed.spottings} old spottings in the regional demo batch.\n`,
    );
    const inserted = await insertGeneratedBatch(prisma, dataset, owner.userId);
    const redOnlyClusters = Object.values(dataset.redOnlyClustersByRegion)
      .flatMap((regionClusters) => Object.values(regionClusters));
    const redOnlyReportCount = redOnlyClusters.reduce(
      (total, cluster) => total + cluster.lostReports,
      0,
    );
    const redOnlyCityCount = redOnlyClusters.filter(
      (cluster) => cluster.lostReports > 0,
    ).length;
    const blueOnlyClusters = Object.values(dataset.blueOnlyClustersByRegion)
      .flatMap((regionClusters) => Object.values(regionClusters));
    const blueOnlySpottingCount = blueOnlyClusters.reduce(
      (total, cluster) => total + cluster.spottings,
      0,
    );
    const blueOnlyCityCount = blueOnlyClusters.filter(
      (cluster) => cluster.spottings > 0,
    ).length;
    process.stdout.write(
      `Requested ${options.points} cluster points; inserted ${inserted.reports} ` +
        `lost reports and ${inserted.spottings} spottings across ${dataset.cities.length} selected cities ` +
        `and ${dataset.hubs.length} regional anchors (${dataset.regionalCounts.south} South, ` +
        `${dataset.regionalCounts.west} West, ${dataset.regionalCounts.northeast} Northeast).\n` +
        `Added ${redOnlyReportCount} red-only lost reports across ${redOnlyCityCount} curated inland city clusters.\n` +
        `Added ${blueOnlySpottingCount} blue-only spottings across ${blueOnlyCityCount} separate curated city clusters.\n` +
        `Added ${inserted.petImages} private pet photo references around public parks and landmarks.\n`,
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`Error adding map cluster demo data: ${error?.message ?? error}\n`);
  process.exitCode = 1;
});
