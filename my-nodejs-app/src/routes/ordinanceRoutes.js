const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {
  createOrdinance,
  getAllOrdinances,
  updateOrdinance
} = require('../controllers/munisOrdinanceControllers');  
 
/* API */

router.post(
  '/add',
  authMiddleware('admin'),
  createOrdinance
);
router.put(
  '/update/:id',
  authMiddleware('admin'),
  updateOrdinance
);


router.get('/list',authMiddleware('admin'), getAllOrdinances);



module.exports = router;
