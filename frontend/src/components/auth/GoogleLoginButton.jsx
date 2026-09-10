import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'

export default function GoogleLoginButton() {

    const navigate = useNavigate()

    const {
        googleLogin,
    } = useAuth()

    const handleSuccess = async (
        credentialResponse
    ) => {

        try {

            const data = await googleLogin(credentialResponse.credential)

            if (data.status === "COMPLETE_COMPANY_SETUP") {
                navigate('/workspace/setup', { state: { email: data.email } })
                return
            }

            if (data.phone_verify) {
                navigate('/verify-phone', {
                    state: {
                        phone: data.phone,
                        email: data.email,
                    },
                })
                return
            }

            if (data.pending) {
                navigate('/pending-approval')
                return
            }

            if (data.mfa_required) {
                navigate('/mfa', {
                    state: {
                        email: data.email,
                    },
                })
                return
            }

            // const role = data.user.role
            // if (role === 'super_admin') {
            //     navigate('/super-admin')
            // } else if (role === 'company_admin') {
            //     navigate('/dashboard')
            // } else if (role === 'operations_manager') {
            //     navigate('/operations')
            // } else {
            //     navigate('/employee')
            // }

            if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
                return;
            }

            const role = data.user?.role || data.role;

            if (role === "super_admin") {
                navigate("/super-admin")
            } else if (role === "company_admin") {
                navigate("/dashboard")
            } else if (role === "operations_manager") {
                navigate("/operations")
            } else {
                navigate("/employee")
            }

        }

        catch (
        err
        ) {

            console.log(err)

        }

    }

    return (

        <GoogleLogin

            onSuccess={
                handleSuccess
            }

            onError={() => {

                alert(
                    'Google Login Failed'
                )

            }}

        />

    )

}