import express from 'express';
import { 
  listCarriers, 
  getCarrierById, 
  createCarrier, 
  updateCarrier, 
  deleteCarrier, 
  createCarrierSchema, 
  updateCarrierSchema 
} from '../controllers/carrierController.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', listCarriers);
router.get('/:id', getCarrierById);

// Create carrier with logo & license upload
router.post(
  '/',
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'license', maxCount: 1 }]),
  validate({ body: createCarrierSchema }),
  createCarrier
);

// Update carrier with optional logo upload
router.put(
  '/:id',
  upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'license', maxCount: 1 }]),
  validate({ body: updateCarrierSchema }),
  updateCarrier
);

// Delete carrier
router.delete('/:id', deleteCarrier);

export default router;
