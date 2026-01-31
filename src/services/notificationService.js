import api from './api';
import useNotificationStore from '../stores/notificationStore';

// Check for low stock and out of stock items
async function checkStockAlerts() {
  try {
    const response = await api.get('/inventory/alerts');
    const alertsData = response.data || {};
    const alerts = alertsData.alerts || alertsData || [];
    const addNotification = useNotificationStore.getState().addNotification;
    const notifications = useNotificationStore.getState().notifications;

    // Get existing notification messages to avoid duplicates
    const existingMessages = new Set(
      notifications
        .filter(n => n.type === 'low_stock' || n.type === 'out_of_stock')
        .map(n => n.message)
    );

    (Array.isArray(alerts) ? alerts : []).forEach((alert) => {
      const currentStock = alert.current_quantity ?? alert.current_stock ?? 0;
      const minStock = alert.threshold_quantity ?? alert.minimum_stock ?? 10;
      const productName = alert.product_name || 'Unknown Product';
      const warehouseName = alert.warehouse_name || 'Warehouse';

      if (currentStock === 0) {
        const message = `${productName} is out of stock in ${warehouseName}`;
        if (!existingMessages.has(message)) {
          addNotification({
            type: 'out_of_stock',
            title: 'Out of Stock Alert',
            message,
            data: { productId: alert.product_id || alert.id, warehouseId: alert.warehouse_id },
          });
        }
      } else if (currentStock <= minStock) {
        const message = `${productName} is running low (${currentStock}/${minStock}) in ${warehouseName}`;
        if (!existingMessages.has(message)) {
          addNotification({
            type: 'low_stock',
            title: 'Low Stock Warning',
            message,
            data: { productId: alert.product_id || alert.id, warehouseId: alert.warehouse_id },
          });
        }
      }
    });
  } catch (error) {
    console.error('Failed to check stock alerts:', error);
  }
}

// Check for recent orders
async function checkRecentOrders() {
  try {
    const response = await api.get('/orders');
    const ordersData = response.data || {};
    const orders = ordersData.orders || ordersData || [];
    const addNotification = useNotificationStore.getState().addNotification;
    const notifications = useNotificationStore.getState().notifications;

    // Get existing order notification IDs
    const existingOrderIds = new Set(
      notifications
        .filter(n => n.type === 'new_order' || n.type === 'order_completed')
        .map(n => n.data?.orderId)
    );

    // Check for new orders (created in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    (Array.isArray(orders) ? orders : []).forEach((order) => {
      const orderDate = new Date(order.created_at);
      if (orderDate > oneHourAgo && !existingOrderIds.has(order.id)) {
        if (order.status === 'pending') {
          addNotification({
            type: 'new_order',
            title: 'New Order Received',
            message: `Order #${order.id} from ${order.client_name || order.client?.name || 'Unknown'} - ₱${parseFloat(order.total_amount || order.total || 0).toLocaleString()}`,
            data: { orderId: order.id },
          });
        } else if (order.status === 'delivered') {
          addNotification({
            type: 'order_completed',
            title: 'Order Completed',
            message: `Order #${order.id} has been delivered successfully`,
            data: { orderId: order.id },
          });
        }
      }
    });
  } catch (error) {
    console.error('Failed to check recent orders:', error);
  }
}

// Check for deliveries
async function checkDeliveries() {
  try {
    const response = await api.get('/deliveries');
    const deliveriesData = response.data || {};
    const deliveries = deliveriesData.deliveries || deliveriesData || [];
    const addNotification = useNotificationStore.getState().addNotification;
    const notifications = useNotificationStore.getState().notifications;

    const existingDeliveryIds = new Set(
      notifications
        .filter(n => n.type?.includes('delivery'))
        .map(n => n.data?.deliveryId)
    );

    // Check for today's scheduled deliveries
    const today = new Date().toISOString().split('T')[0];
    (Array.isArray(deliveries) ? deliveries : []).forEach((delivery) => {
      if (existingDeliveryIds.has(delivery.id)) return;

      const deliveryDate = (delivery.scheduled_date || delivery.delivery_date)?.split('T')[0];
      const clientName = delivery.client_name || delivery.client?.name || 'Unknown';

      if (deliveryDate === today && delivery.status === 'scheduled') {
        addNotification({
          type: 'delivery_scheduled',
          title: 'Delivery Scheduled Today',
          message: `Delivery #${delivery.id} to ${clientName} is scheduled for today`,
          data: { deliveryId: delivery.id },
        });
      } else if (delivery.status === 'delivered') {
        const completedDate = new Date(delivery.updated_at || delivery.created_at);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (completedDate > oneHourAgo) {
          addNotification({
            type: 'delivery_completed',
            title: 'Delivery Completed',
            message: `Delivery #${delivery.id} to ${clientName} completed successfully`,
            data: { deliveryId: delivery.id },
          });
        }
      } else if (delivery.status === 'failed') {
        addNotification({
          type: 'delivery_failed',
          title: 'Delivery Failed',
          message: `Delivery #${delivery.id} to ${clientName} has failed`,
          data: { deliveryId: delivery.id },
        });
      }
    });
  } catch (error) {
    console.error('Failed to check deliveries:', error);
  }
}

// Check for payment dues
async function checkPaymentDues() {
  try {
    const response = await api.get('/orders');
    const ordersData = response.data || {};
    const orders = ordersData.orders || ordersData || [];
    const addNotification = useNotificationStore.getState().addNotification;
    const notifications = useNotificationStore.getState().notifications;

    const existingPaymentIds = new Set(
      notifications
        .filter(n => n.type === 'payment_due')
        .map(n => n.data?.orderId)
    );

    // Check for unpaid orders that are delivered
    (Array.isArray(orders) ? orders : []).forEach((order) => {
      if (
        order.status === 'delivered' &&
        order.payment_status !== 'paid' &&
        !existingPaymentIds.has(order.id)
      ) {
        addNotification({
          type: 'payment_due',
          title: 'Payment Due',
          message: `Payment pending for Order #${order.id} - ₱${parseFloat(order.total_amount || order.total || 0).toLocaleString()}`,
          data: { orderId: order.id },
        });
      }
    });
  } catch (error) {
    console.error('Failed to check payment dues:', error);
  }
}

// Generate welcome notification for first time users
function generateWelcomeNotification() {
  const notifications = useNotificationStore.getState().notifications;
  const addNotification = useNotificationStore.getState().addNotification;

  const hasWelcome = notifications.some(n => n.type === 'system' && n.title === 'Welcome to Tres Marias!');
  
  if (!hasWelcome && notifications.length === 0) {
    addNotification({
      type: 'system',
      title: 'Welcome to Tres Marias!',
      message: 'Your distribution management system is ready. Check out the dashboard to get started.',
    });
  }
}

// Initialize notification polling
let pollingInterval = null;

export function startNotificationPolling(intervalMs = 60000) {
  // Initial check
  generateWelcomeNotification();
  
  // Run all checks
  const runAllChecks = async () => {
    await Promise.all([
      checkStockAlerts(),
      checkRecentOrders(),
      checkDeliveries(),
      checkPaymentDues(),
    ]);
  };

  // Run immediately
  runAllChecks();

  // Then poll at interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  pollingInterval = setInterval(runAllChecks, intervalMs);

  return () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  };
}

export function stopNotificationPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// Manual notification triggers for use in other components
export function notifyNewOrder(order) {
  useNotificationStore.getState().addNotification({
    type: 'new_order',
    title: 'New Order Created',
    message: `Order #${order.id} - ₱${parseFloat(order.total_amount || 0).toLocaleString()}`,
    data: { orderId: order.id },
  });
}

export function notifyOrderComplete(order) {
  useNotificationStore.getState().addNotification({
    type: 'order_completed',
    title: 'Order Completed',
    message: `Order #${order.id} has been completed successfully`,
    data: { orderId: order.id },
  });
}

export function notifyDeliveryScheduled(delivery) {
  useNotificationStore.getState().addNotification({
    type: 'delivery_scheduled',
    title: 'Delivery Scheduled',
    message: `Delivery #${delivery.id} scheduled for ${delivery.client_name || 'Unknown'}`,
    data: { deliveryId: delivery.id },
  });
}

export function notifyPaymentReceived(order) {
  useNotificationStore.getState().addNotification({
    type: 'payment_received',
    title: 'Payment Received',
    message: `Payment of ₱${parseFloat(order.amount || order.total_amount || 0).toLocaleString()} received for Order #${order.id}`,
    data: { orderId: order.id },
  });
}

export function notifyNewClient(client) {
  useNotificationStore.getState().addNotification({
    type: 'new_client',
    title: 'New Client Added',
    message: `${client.name} has been added to the system`,
    data: { clientId: client.id },
  });
}

export function notifyCustom(title, message, type = 'system') {
  useNotificationStore.getState().addNotification({
    type,
    title,
    message,
  });
}

export default {
  startNotificationPolling,
  stopNotificationPolling,
  notifyNewOrder,
  notifyOrderComplete,
  notifyDeliveryScheduled,
  notifyPaymentReceived,
  notifyNewClient,
  notifyCustom,
};
