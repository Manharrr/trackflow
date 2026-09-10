export const validateEmployeeForm = (data) => {
  const errors = {};

  if (!data.full_name || data.full_name.trim().length < 3) {
    errors.full_name = "Full name is required (minimum 3 characters).";
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.email = "A valid email address is required.";
  }

  const phoneRegex = /^\+?[0-9]{10,15}$/;
  if (!data.phone || !phoneRegex.test(data.phone.replace(/[\s-()]/g, ""))) {
    errors.phone = "A valid phone number is required (10-15 digits).";
  }

  if (!data.role) {
    errors.role = "Role selection is required.";
  } else if (!["employee", "operations_manager"].includes(data.role)) {
    errors.role = "Invalid role selected.";
  }

  if (!data.department || data.department.trim() === "") {
    errors.department = "Department is required.";
  }

  if (!data.designation || data.designation.trim() === "") {
    errors.designation = "Designation is required.";
  }

  if (data.emergency_contact && !phoneRegex.test(data.emergency_contact.replace(/[\s-()]/g, ""))) {
    errors.emergency_contact = "Emergency contact must be a valid phone number (10-15 digits).";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
