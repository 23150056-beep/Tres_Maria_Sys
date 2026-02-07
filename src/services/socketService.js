import { io } from 'socket.io-client';
import useNotificationStore from '../stores/notificationStore';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

class SocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(userId) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.reconnectAttempts = 0;
      
      // Join user-specific room
      if (userId) {
        this.socket.emit('join-room', `user:${userId}`);
      }
      // Join general updates room
      this.socket.emit('join-room', 'updates');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });

    // ====================================================
    // ORDER EVENTS
    // ====================================================
    
    this.socket.on('order:created', (order) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: 'new_order',
        title: 'New Order Created',
        message: `Order ${order.order_number} created - ₱${parseFloat(order.total_amount).toLocaleString()}`,
        data: { orderId: order.id, orderNumber: order.order_number },
      });
      toast.success(`New order ${order.order_number} created`);
    });

    this.socket.on('order:updated', (order) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: 'order_update',
        title: 'Order Status Updated',
        message: `Order ${order.order_number} is now ${order.status}`,
        data: { orderId: order.id, orderNumber: order.order_number, status: order.status },
      });
    });

    this.socket.on('order:approved', (order) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: 'order_approved',
        title: 'Order Approved',
        message: `Order ${order.order_number} has been approved`,
        data: { orderId: order.id, orderNumber: order.order_number },
      });
      toast.success(`Order ${order.order_number} approved`);
    });

    // ====================================================
    // DELIVERY EVENTS
    // ====================================================

    this.socket.on('delivery:created', (delivery) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: 'delivery_created',
        title: 'Delivery Scheduled',
        message: `Delivery ${delivery.delivery_number} scheduled with ${delivery.orderCount} orders`,
        data: { deliveryId: delivery.id, deliveryNumber: delivery.delivery_number },
      });
    });

    this.socket.on('delivery:started', ({ deliveryId, status }) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: 'delivery_started',
        title: 'Delivery In Transit',
        message: `Delivery #${deliveryId.slice(0, 8)} has departed`,
        data: { deliveryId, status },
      });
      toast('🚚 Delivery has started', { icon: '🚚' });
    });

    this.socket.on('delivery:updated', (delivery) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: 'delivery_update',
        title: 'Delivery Status Updated',
        message: `Delivery ${delivery.delivery_number} is now ${delivery.status}`,
        data: { deliveryId: delivery.id, deliveryNumber: delivery.delivery_number, status: delivery.status },
      });
    });

    this.socket.on('delivery:stop:updated', ({ deliveryId, stopId, status }) => {
      const { addNotification } = useNotificationStore.getState();
      
      if (status === 'delivered') {
        addNotification({
          type: 'stop_delivered',
          title: 'Delivery Stop Completed',
          message: `A delivery stop has been marked as delivered`,
          data: { deliveryId, stopId, status },
        });
      } else if (status === 'failed') {
        addNotification({
          type: 'stop_failed',
          title: 'Delivery Stop Failed',
          message: `A delivery stop has failed`,
          data: { deliveryId, stopId, status },
        });
        toast.error('Delivery stop failed');
      }
    });

    this.socket.on('delivery:completed', ({ deliveryId, status }) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: 'delivery_completed',
        title: 'Delivery Completed',
        message: `Delivery has been completed successfully`,
        data: { deliveryId, status },
      });
      toast.success('Delivery completed successfully');
    });

    this.socket.on('delivery:proof:uploaded', ({ deliveryId, stopId }) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: 'proof_uploaded',
        title: 'Proof of Delivery',
        message: `Proof of delivery has been uploaded`,
        data: { deliveryId, stopId },
      });
    });

    // ====================================================
    // DRIVER LOCATION UPDATES
    // ====================================================

    this.socket.on('driver:location', ({ driverId, latitude, longitude, timestamp }) => {
      // This can be used to update a map in real-time
      // For now, we just log it - can be extended to update UI state
      console.log('Driver location update:', { driverId, latitude, longitude, timestamp });
    });

    // ====================================================
    // INVENTORY EVENTS
    // ====================================================

    this.socket.on('inventory:low_stock', (data) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${data.productName} is running low (${data.currentStock} units)`,
        data,
      });
      toast.error(`Low stock: ${data.productName}`);
    });

    this.socket.on('inventory:updated', (data) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        type: 'inventory_update',
        title: 'Inventory Updated',
        message: `${data.productName} stock updated`,
        data,
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Emit custom events
  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  // Join a specific room
  joinRoom(room) {
    if (this.socket?.connected) {
      this.socket.emit('join-room', room);
    }
  }

  // Leave a specific room
  leaveRoom(room) {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', room);
    }
  }

  // Check if connected
  isConnected() {
    return this.socket?.connected || false;
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
