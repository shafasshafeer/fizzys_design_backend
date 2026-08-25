import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

const router = express.Router();

// ============================================
// GET all orders
// ============================================
router.get('/', async (req, res) => {
  try {
    const { limit = 50, page = 1, status, paymentStatus } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    
    const orders = await Order.find(filter)
      .populate('items.productId', 'name image')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Order.countDocuments(filter);
    
    res.json({
      success: true,
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// GET single order
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.productId', 'name image description');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// POST create order
// ============================================
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Validate stock
    for (const item of orderData.items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.name} not found`
        });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Only ${product.stock} left.`
        });
      }
    }
    
    const order = new Order(orderData);
    await order.save();
    
    // Update stock
    for (const item of orderData.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }
    
    res.status(201).json({
      success: true,
      order,
      message: 'Order created! Please complete payment.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// PUT update order status with payment
// ============================================
router.put('/:id/status', async (req, res) => {
  try {
    const { status, paymentStatus, transactionReference, userConfirmedPayment } = req.body;
    
    const validStatuses = ['pending', 'pending_verification', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    const validPaymentStatuses = ['pending', 'paid', 'failed'];
    
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }
    
    const updateData = {};
    if (status) {
      updateData.status = status;
      if (status === 'confirmed') {
        updateData.confirmedAt = new Date();
      }
      if (status === 'shipped') {
        updateData.shippedAt = new Date();
      }
      if (status === 'delivered') {
        updateData.deliveredAt = new Date();
      }
    }
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (transactionReference) updateData.transactionReference = transactionReference;
    if (userConfirmedPayment) {
      updateData.userConfirmedPayment = true;
      updateData.userConfirmedAt = new Date();
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      order,
      message: `Order updated successfully`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// PUT update order (general)
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      order,
      message: 'Order updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// DELETE order (Only for delivered or cancelled)
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Only allow deletion of delivered or cancelled orders
    if (order.status !== 'delivered' && order.status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered or cancelled orders can be deleted'
      });
    }
    
    // Restore stock when order is deleted
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: item.quantity } }
      );
    }
    
    await Order.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Order deleted successfully and stock restored'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;