import { GoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'

import { useAuth, getTenantWorkspaceOrigin } from '../../contexts/AuthContext'
import { buildTenantRedirectUrl, getStoredRefreshToken } from '../../services/authSession'

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
                        tenant: data.tenant,
                    },
                })
                return
            }

            if (data.redirectUrl) {
                if (data.redirectUrl.startsWith("http://") || data.redirectUrl.startsWith("https://")) {
                    window.location.replace(data.redirectUrl);
                } else {
                    navigate(data.redirectUrl, { replace: true });
                }
                return;
            }

            const role = data.user?.role || data.role;

            if (role === "super_admin") {
                navigate("/super-admin", { replace: true })
            } else if (role === "company_admin") {
                navigate("/dashboard", { replace: true })
            } else if (role === "operations_manager") {
                navigate("/operations", { replace: true })
            } else {
                navigate("/employee", { replace: true })
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