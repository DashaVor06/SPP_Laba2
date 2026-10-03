import express from 'express';
import { 
  listBuses, 
  getBusById, 
  createBus, 
  updateBus, 
  deleteBus, 
  createBusSchema, 
  updateBusSchema 
} from '../controllers/busController.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', listBuses);
router.get('/:id', getBusById);

router.post(
  '/',
  upload.single('photo'),
  validate({ body: createBusSchema }),
  createBus
);

router.put(
  '/:id',
  upload.single('photo'),
  validate({ body: updateBusSchema }),
  updateBus
);

router.delete('/:id', deleteBus);

export default router;
