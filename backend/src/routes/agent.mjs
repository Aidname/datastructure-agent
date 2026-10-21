import express from 'express';
import explainHandler from '../agent/explain.mjs';

const router = express.Router();

// POST /api/agent/explain
router.post('/explain', express.json(), async (req, res) => {
  try {
    const result = await explainHandler(req.body);
    res.json(result);
  } catch (err) {
    console.error('Agent explain error:', err);
    res.status(500).json({ error: 'Agent explain failed', detail: err.message });
  }
});

export default router;
