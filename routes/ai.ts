import express from 'express';
import { labelClusters } from '../controllers/labelClusters';

const router = express.Router();

router.post('/label-clusters', labelClusters);

export default router;
