import express from 'express';

const router = express.Router();

// Temporary test route
router.get('/test', (req, res) => {
  res.status(200).json({ success: true, message: 'Route is working!' });
});

export default router;