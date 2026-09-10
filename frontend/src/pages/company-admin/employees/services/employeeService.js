import axiosInstance from "../../../../api/axios";

export const createEmployee = async (employeeData) => {
  const response = await axiosInstance.post("/employees/create/", employeeData);
  return response.data;
};

export const verifyActivationToken = async (token) => {
  const response = await axiosInstance.post("/employees/verify/", { token });
  return response.data;
};

export const activateAccount = async (token, password, confirmPassword) => {
  const response = await axiosInstance.post("/employees/activate/", {
    token,
    password,
    confirm_password: confirmPassword,
  });
  return response.data;
};

export const listEmployees = async (search = "", role = "", isActive = "", page = 1) => {
  const params = {};
  if (search) params.search = search;
  if (role) params.role = role;
  if (isActive !== "") params.is_active = isActive;
  if (page) params.page = page;

  const response = await axiosInstance.get("/employees/", { params });
  return response.data;
};

export const getEmployeeDetails = async (id) => {
  const response = await axiosInstance.get(`/employees/${id}/`);
  return response.data;
};

export const updateEmployee = async (id, data) => {
  const response = await axiosInstance.patch(`/employees/${id}/update/`, data);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await axiosInstance.delete(`/employees/${id}/delete/`);
  return response.data;
};

export const activateEmployee = async (id) => {
  const response = await axiosInstance.post(`/employees/${id}/activate/`);
  return response.data;
};

export const deactivateEmployee = async (id) => {
  const response = await axiosInstance.post(`/employees/${id}/deactivate/`);
  return response.data;
};

export const getEmployeeProfile = async () => {
  const response = await axiosInstance.get("/employees/profile/");
  return response.data;
};

export const updateEmployeeProfile = async (data) => {
  const response = await axiosInstance.patch("/employees/profile/", data);
  return response.data;
};

export const getEmployeeDashboard = async () => {
  const response = await axiosInstance.get("/employees/dashboard/");
  return response.data;
};
