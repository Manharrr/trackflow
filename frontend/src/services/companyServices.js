import axiosInstance from "../api/axios";

export const getCompanies = () =>
    axiosInstance.get("/companies/");

export const getPendingCompanies = () =>
    axiosInstance.get("/companies/pending/");

export const getCompany = (id) =>
    axiosInstance.get(`/companies/${id}/`);

export const approveCompany = (id) =>
    axiosInstance.post(`/companies/${id}/approve/`);

export const rejectCompany = (
    id,
    reason
) =>
    axiosInstance.post(
        `/companies/${id}/reject/`,
        {
            reason,
        }
    );