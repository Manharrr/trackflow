import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function RegisterForm() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()

  const password = watch('password')

  const onSubmit = async (data) => {
    setServerError('')
    try {
      await registerUser(data.email, data.username, data.password, data.confirm_password)
      navigate('/dashboard')
    } catch (err) {
      const errData = err.response?.data
      if (typeof errData === 'object') {
        const firstError = Object.values(errData)[0]
        setServerError(Array.isArray(firstError) ? firstError[0] : firstError)
      } else {
        setServerError('Registration failed. Try again.')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-sm border border-gray-100 p-8">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-sm text-gray-500 mt-1">Get started today</p>
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
            placeholder="you@example.com"
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
            label="Username"
            placeholder="yourname"
            error={errors.username?.message}
            {...register('username', {
              required: 'Username is required',
              minLength: { value: 3, message: 'Minimum 3 characters' },
            })}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Minimum 8 characters' },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message: 'Must include uppercase, lowercase and number',
              },
            })}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirm_password?.message}
            {...register('confirm_password', {
              required: 'Please confirm password',
              validate: (val) => val === password || 'Passwords do not match',
            })}
          />

          <Button type="submit" loading={isSubmitting}>
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}