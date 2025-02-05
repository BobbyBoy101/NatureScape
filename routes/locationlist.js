import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
const mapboxApiKey = process.env.MAPBOX_API_KEY;
import * as locationMethods from '../data/locations.js';
import { photos, locations } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';
import { checkXss } from '../middleware.js'

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const locations = await locationMethods.getAllPhotos();
    res.render('locations/locationlist', {css:"/public/css/locationlist.css", title: "Locations", token: mapboxApiKey, js:"/public/js/locationlist.js", locations: JSON.stringify(locations)});
  } catch (error) {
    console.log(error);
    res.status(500).render('error', {
      css: '/public/css/error.css',
      js: '/public/js/locationlist.js',
      title: 'Retrieving Location Information Error',
      message: 'Unable to retrieve location information from Database.',
      error: error
    });
  }
})

router.get('/:locationId', checkXss, async (req, res) => {
  try {
    
    //Get location using locationId(req, res) => {
    const locationCollection = await locations();
    const locationFound = await locationCollection.findOne({
      _id: new ObjectId(req.params.locationId)
    });

    const location = {
      _id: locationFound._id,
      state: locationFound.state,
      city: locationFound.city,
      location_name: locationFound.area
    };
    
    let formattedPhotos;
    const photoCollection = await photos()
    const userPhotos = await photoCollection.find(
      { 'location.location_id': new ObjectId(req.params.locationId) }).toArray();
    formattedPhotos = userPhotos.map(photo => ({
      _id: photo._id,
      photo_name: photo.photo_name,
      photo_description: photo.photo_description,
      photo_date_time: photo.date_time_taken ?? photo.date_time_uploaded,
      likes: photo.likes,
      views: photo.views,
      img: {
        data: photo.img.data.toString('base64'),
        contentType: photo.img.contentType
      }
    })).sort((a, b) => b.photo_date_time - a.photo_date_time);

    //Render page using location data and photos
    return res.render('locations/location_view_edit', {
      locationName: location.location_name, 
      city: location.city, 
      state: location.state, 
      images: formattedPhotos,
      title: `${location.location_name}`, 
      css: '/public/css/location_view_edit.css', 
      js: '/public/js/location_view_edit.js'
    });

  } catch (error) {
    console.log(error);
    res.status(500).render('error', {
      css: '/public/css/error.css',
      js: 'public/js/location_view_edit.js',
      title: 'Retrieving Location Information Error',
      message: 'Error retrieving images',
      error: error
    });
  }
});

router.post('/:locationId/filterImages', checkXss, async (req, res) => {
  try {
    const locationId = req.params.locationId;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).send('Start and end dates are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      return res.status(400).send('Start date cannot be after end date');
    }

    const photoCollection = await photos();
    const userPhotos = await photoCollection.find({
      'location.location_id': new ObjectId(locationId),
      $or: [
        { date_time_taken: { $gte: start, $lte: end } },
        { date_time_taken: null, date_time_uploaded: { $gte: start, $lte: end } }
      ]
    }).toArray();

    const formattedPhotos = userPhotos.map(photo => ({
      _id: photo._id,
      photo_name: photo.photo_name,
      photo_description: photo.photo_description,
      photo_date_time: photo.date_time_taken ?? photo.date_time_uploaded,
      img: {
        data: photo.img.data.toString('base64'),
        contentType: photo.img.contentType
      }
    })).sort((a, b) => new Date(b.photo_date_time) - new Date(a.photo_date_time));

    return res.json({ images: formattedPhotos });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      css: '/public/css/error.css',
      js: 'public/js/location_view_edit.js',
      title: 'Retrieving Filtered Images Error',
      message: 'Error retrieving images',
      error: error
    });
  }
});

export default router