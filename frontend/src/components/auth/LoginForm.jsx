import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function LoginForm() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [serverError, setServerError] = useState('')

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm()

    const onSubmit = async (data) => {
        setServerError('')
        try {
            const res = await login(data.email, data.password)
            // MFA enabled aanel mfa page il pokunnu
            if (res.user?.is_mfa_enabled) {
                navigate('/mfa-verify')
            } else {
                navigate('/dashboard')
            }
        } catch (err) {
            const errMsg = err.response?.data?.error || err.response?.data?.detail || 'Login failed. Try again.'
            setServerError(errMsg)
            toast.error(errMsg)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-sm border border-gray-100 p-8">

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
                    <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
                </div>

                {serverError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{serverError}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        register={register}
                        error={errors.email?.message}
                        {...register('email', {
                            required: 'Email is required',
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: 'Enter a valid email',
                            },
                        })}
                    />

                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        placeholder="••••••••"
                        register={register}
                        error={errors.password?.message}
                        {...register('password', {
                            required: 'Password is required',
                            minLength: { value: 8, message: 'Minimum 8 characters' },
                        })}
                    />

                    {/* <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div> */}
                    <div className="flex justify-end">
                        <Link
                            to="/forgot-password"
                            className="text-sm text-[#0F766E]"
                        >
                            Forgot Password?
                        </Link>
                    </div>

                    <Button type="submit" loading={isSubmitting}>
                        Sign in
                    </Button>
                </form>

                <p className="text-center text-sm text-gray-500 mt-6">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-blue-600 font-medium hover:underline">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    )
}