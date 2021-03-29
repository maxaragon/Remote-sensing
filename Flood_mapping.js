// Load Sentinel-1 images to map Mexico, Sep 2018.


// Default location
var pt = ee.Geometry.Point(-109.75260, 26.32235); // Sinaloa, Mexico


// Load Sentinel-1 C-band SAR Ground Range collection (log scaling, VV co-polar)
var collection = ee.ImageCollection('COPERNICUS/S1_GRD').filterBounds(pt)
.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
.select('VV');


// Filter by date
var before = collection.filterDate('2018-09-01', '2018-09-17').mosaic();
var after = collection.filterDate('2018-09-19', '2018-10-01').mosaic();

// Threshold smoothed radar intensities to identify "flooded" areas.
var SMOOTHING_RADIUS = 100;
var DIFF_UPPER_THRESHOLD = -3;

var diff_smoothed = after.focal_median(SMOOTHING_RADIUS, 'circle', 'meters')
.subtract(before.focal_median(SMOOTHING_RADIUS, 'circle', 'meters'));

var diff_thresholded = diff_smoothed.lt(DIFF_UPPER_THRESHOLD);

// Display map
Map.centerObject(pt, 8);
Map.addLayer(before, {min:-25,max:0}, 'Before flood');
Map.addLayer(after, {min:-25,max:0}, 'After flood');
Map.addLayer(after.subtract(before), {min:-10,max:10}, 'After - before', 0);
Map.addLayer(diff_smoothed, {min:-10,max:10}, 'diff smoothed', 0);
Map.addLayer(diff_thresholded.updateMask(diff_thresholded),
{palette:"0000FF"},'flooded areas - blue',1);/**
 * Function to mask clouds using the Sentinel-2 QA band
 * @param {ee.Image} image Sentinel-2 image
 * @return {ee.Image} cloud masked Sentinel-2 image
 */
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

// Map the function over one year of data and take the median.
// Load Sentinel-2 TOA reflectance data.
var dataset = ee.ImageCollection('COPERNICUS/S2')
                  .filterDate('2018-01-01', '2018-06-30')
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
                  .map(maskS2clouds);

var rgbVis = {
  min: 0.0,
  max: 0.3,
  bands: ['B4', 'B3', 'B2'],
};

//Map.setCenter(-9.1695, 38.6917, 12);
Map.addLayer(dataset.median(), rgbVis, 'RGB');


