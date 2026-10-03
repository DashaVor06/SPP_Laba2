import express from 'express';
import { 
  listBookings, 
  getBookingById, 
  createBooking, 
  updateBooking, 
  deleteBooking, 
  createBookingSchema, 
  updateBookingSchema 
} from '../controllers/bookingController.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', listBookings);
router.get('/:id', getBookingById);

// Create booking with optional document upload (студенческий / удостоверение)
router.post(
  '/',
  upload.single('document'),
  validate({ body: createBookingSchema }),
  createBooking
);

router.put('/:id', validate({ body: updateBookingSchema }), updateBooking);
router.delete('/:id', deleteBooking);

export default router;
