import express from 'express';
import pollappRoutes from './pollapp';

const router = express.Router();

router.use("/pollapp", pollappRoutes);

export default router;
