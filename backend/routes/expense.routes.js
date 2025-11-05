import express from 'express';
import {
  createExpense,
  getExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
  approveExpense
} from '../controllers/expense.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create expense (staff, manager, owner)
router.post('/', authorize(['staff', 'manager', 'owner']), createExpense);

// Get all expenses (staff, manager, owner)
router.get('/', authorize(['staff', 'manager', 'owner']), getExpenses);

// Get single expense (staff, manager, owner)
router.get('/:expenseId', authorize(['staff', 'manager', 'owner']), getExpense);

// Update expense (staff, manager, owner)
router.put('/:expenseId', authorize(['staff', 'manager', 'owner']), updateExpense);

// Delete expense (manager, owner)
router.delete('/:expenseId', authorize(['manager', 'owner']), deleteExpense);

// Approve expense (manager, owner)
router.post('/:expenseId/approve', authorize(['manager', 'owner']), approveExpense);

export default router;

