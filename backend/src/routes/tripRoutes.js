import express from 'express';
import { 
  listTrips, 
  getTripById, 
  createTrip, 
  updateTrip, 
  deleteTrip, 
  createTripSchema, 
  updateTripSchema 
} from '../controllers/tripController.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.get('/', listTrips);
router.get('/:id', getTripById);
router.post('/', validate({ body: createTripSchema }), createTrip);
router.put('/:id', validate({ body: updateTripSchema }), updateTrip);
router.delete('/:id', deleteTrip);

export default router;
