import axiosInstance from "../api/axios";

export const listOrders = async (params = {}) => {
  const response = await axiosInstance.get("/orders/", { params });
  return response.data;
};

export const createOrder = async (data) => {
  const response = await axiosInstance.post("/orders/create/", data);
  return response.data;
};

export const getOrderDetails = async (id) => {
  const response = await axiosInstance.get(`/orders/${id}/`);
  return response.data;
};

export const updateOrder = async (id, data) => {
  const response = await axiosInstance.patch(`/orders/${id}/`, data);
  return response.data;
};

export const deleteOrder = async (id) => {
  const response = await axiosInstance.delete(`/orders/${id}/`);
  return response.data;
};

export const restoreOrder = async (id) => {
  const response = await axiosInstance.post(`/orders/${id}/restore/`);
  return response.data;
};

export const assignOrder = async (id, employeeId, reason = "") => {
  const payload = { employee_id: employeeId };
  if (reason) payload.reason = reason;
  const response = await axiosInstance.post(`/orders/${id}/assign/`, payload);
  return response.data;
};

export const bulkAssignOrders = async (orderIds, employeeId) => {
  const response = await axiosInstance.post("/orders/bulk-assign/", {
    order_ids: orderIds,
    employee_id: employeeId,
  });
  return response.data;
};

export const updateOrderStatus = async (id, status, remarks = "") => {
  const response = await axiosInstance.post(`/orders/${id}/status/`, {
    status,
    remarks,
  });
  return response.data;
};

export const cancelOrder = async (id, reason) => {
  const response = await axiosInstance.post(`/orders/${id}/cancel/`, { reason });
  return response.data;
};

export const failDelivery = async (id, reason, remarks = "") => {
  const response = await axiosInstance.post(`/orders/${id}/fail/`, {
    reason,
    remarks,
  });
  return response.data;
};

export const markDelayed = async (id, reason, remarks = "") => {
  const response = await axiosInstance.post(`/orders/${id}/delay/`, {
    reason,
    remarks,
  });
  return response.data;
};

export const getOrderTimeline = async (id) => {
  const response = await axiosInstance.get(`/orders/${id}/timeline/`);
  return response.data;
};

export const getOrderDashboard = async () => {
  const response = await axiosInstance.get("/orders/dashboard/");
  return response.data;
};

export const getOperationsDashboard = async () => {
  const response = await axiosInstance.get("/orders/operations-dashboard/");
  return response.data;
};

export const getOperationsTeamOverview = async () => {
  const response = await axiosInstance.get("/orders/operations-dashboard/team-overview/");
  return response.data;
};

export const getOperationsLeaderboard = async () => {
  const response = await axiosInstance.get("/orders/operations-dashboard/leaderboard/");
  return response.data;
};

export const getOperationsCharts = async () => {
  const response = await axiosInstance.get("/orders/operations-dashboard/charts/");
  return response.data;
};

export const getAssignablePartners = async () => {
  const response = await axiosInstance.get("/orders/operations-dashboard/assignable-partners/");
  return response.data;
};
