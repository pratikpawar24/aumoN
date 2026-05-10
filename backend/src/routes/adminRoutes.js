const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, requireAdmin, requireMasterAdmin } = require('../middleware/auth');

// All admin routes require auth + admin role.
router.use(protect, requireAdmin);

// Shared (any admin)
router.get('/stats',           adminController.getStats);
router.get('/users',           adminController.listUsers);
router.get('/users/:id',       adminController.getUser);
router.post('/users/:id/block',   adminController.blockUser);
router.post('/users/:id/unblock', adminController.unblockUser);
router.delete('/users/:id',    adminController.removeUser);
router.get('/rides/active',    adminController.activeRides);

// Master-only
router.get('/admins',          requireMasterAdmin, adminController.listAdmins);
router.post('/admins',         requireMasterAdmin, adminController.createAdmin);
router.get('/admins/activity', requireMasterAdmin, adminController.adminActivity);
router.post('/admins/:id/block',   requireMasterAdmin, adminController.blockUser);
router.post('/admins/:id/unblock', requireMasterAdmin, adminController.unblockUser);
router.delete('/admins/:id',   requireMasterAdmin, adminController.removeUser);

module.exports = router;
