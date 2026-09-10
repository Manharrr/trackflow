# Employee Onboarding & Registration Workflow

This document details the employee onboarding process on the TrackFlow AI multi-tenant platform.

## 1. Employee Creation by Administrator
* Only the **Company Admin** or an authorized **Operations Manager** can initiate employee onboarding.
* Self-registration/onboarding by employees from a public route is disabled to maintain strict multi-tenant isolation.
* To create an employee, the Admin navigates to the Employees Directory in the dashboard (`/dashboard/employees`) and clicks "Add Employee" (`/dashboard/employees/create`).
* The Admin inputs the employee's standard details:
  * Full Name
  * Email (must be unique)
  * Phone Number
  * Role (e.g., Operations Manager, Courier / Driver, Employee)

## 2. Activation Email Invitation
* Upon form submission, the Django backend creates an inactive employee profile and generates a secure activation token.
* An automated invitation email is dispatched to the employee's registered email address.
* The email contains a link in the following structure:
  ```text
  http://<subdomain>.logesticgo.localhost:5173/activate-account/<activation-token>
  ```
* This link points to the frontend registration/activation page.

## 3. Self-Registration and Activation
* The employee clicks the invitation link received via email.
* They are redirected to the **Activate Account** page (`/activate-account/:token`).
* On this page, the employee:
  * Verifies their email identity.
  * Inputs and confirms their new password.
  * Completes registration.
* Upon successful password configuration, the account is marked active, and they are prompted to log in and set up multi-factor authentication (MFA) to access their workspace.
