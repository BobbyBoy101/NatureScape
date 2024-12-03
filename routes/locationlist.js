import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
const mapboxApiKey = process.env.MAPBOX_API_KEY;
import * as locationMethods from '../data/locations.js';
import { photos, locations } from '../config/mongoCollections.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

router.get('/', (req, res) => {
  res.render('locations/locationlist', {css: "/public/css/locationlist.css", token: mapboxApiKey, js: "/public/js/locationlist.js"});
});

router.get('/test', async (req, res) => {
  const photos = await locationMethods.getAllPhotos();
  res.json(photos);
});

router.get('/:locationId', async (req, res) => {
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

  const photoCollection = await photos()
  const userPhotos = await photoCollection.find({ location_id: req.params.locationId }).toArray();
  const formattedPhotos = userPhotos.map(photo => ({
    _id: photo._id,
    photo_name: photo.photo_name,
    photo_description: photo.photo_description,
    likes: photo.likes,
    views: photo.views,
    img: {
      data: photo.img.data.toString('base64'),
      contentType: photo.img.contentType
    }
  }));

  //Render page using location data and photos
  res.render('locations/location_view_edit', {
    locationName: location.location_name, 
    city: location.city, 
    state: location.state, 
    images: formattedPhotos, 
    css: '/public/css/location_view_edit.css', 
    js: '/public/js/location_view_edit.js'
  });

})
//.post()

export default router