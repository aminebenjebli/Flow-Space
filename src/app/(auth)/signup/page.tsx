"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpModal } from "@/components/auth/otp-modal";
import { signupSchema, type SignupFormData } from "@/lib/validations/schemas";
import { api } from "@/lib/api/axios";
import { toast } from "react-hot-toast";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    try {
      // Create the user account - backend returns user data with OTP sent
      const signupResponse = await api.auth.signup({
        email: data.email,
        password: data.password,
        name: data.firstName,
      });

      console.log("Signup response:", signupResponse); // Debug log

      // Backend returns user object directly (not wrapped in ApiResponse)
      // Check for user data in response.data (the actual user object)
      const userData = signupResponse.data || signupResponse;

      if (userData && userData.email) {
        toast.success("Account created! Please verify your email.");

        // Store email and password for auto-login after verification
        setUserEmail(data.email);
        setUserPassword(data.password);

        console.log("Setting OTP modal to true"); // Debug log
        // Show OTP modal
        setShowOtpModal(true);
      } else {
        console.log("Unexpected response structure:", signupResponse);
        toast.error(
          "Account created but verification modal failed to open. Please try verifying from the login page."
        );
      }
    } catch (error: any) {
      console.error("Signup error:", error);

      // Handle specific error messages from the API
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.message?.includes("email")) {
        toast.error("This email is already registered. Please try logging in.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSuccess = async () => {
    console.log("Verification success handler called");

    // Close the modal first
    setShowOtpModal(false);

    // Show loading toast
    toast.success("Email verified! Signing you in...");

    try {
      const result = await signIn("credentials", {
        email: userEmail,
        password: userPassword,
        redirect: false,
      });

      console.log("Auto sign-in result:", result);

      if (result?.error) {
        console.error("Auto sign-in failed:", result.error);
        toast.error(
          "Verification successful but sign-in failed. Please try logging in manually."
        );
        router.push("/login");
        return;
      }

      // If sign-in successful, redirect to dashboard
      toast.success("Welcome to FlowSpace!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Auto sign-in error:", error);
      toast.error("Please try logging in manually.");
      router.push("/login");
    }
  };

  const handleCloseOtpModal = () => {
    setShowOtpModal(false);
    toast.success("You can verify your email later from the login page.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4">
      <div className="flow-card rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-card-foreground mb-2">
            Create Account
          </h1>
          <p className="text-muted-foreground">
            Join FlowSpace and boost your productivity
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Input
              id="firstName"
              type="text"
              placeholder="First Name"
              {...register("firstName")}
              className={errors.firstName ? "border-red-500" : ""}
            />
            {errors.firstName && (
              <p className="text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Input
              id="email"
              type="email"
              placeholder="Email"
              {...register("email")}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                {...register("password")}
                className={errors.password ? "border-red-500 pr-10" : "pr-10"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                {...register("confirmPassword")}
                className={
                  errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <OtpModal
        isOpen={showOtpModal}
        onClose={handleCloseOtpModal}
        email={userEmail}
        onVerificationSuccess={handleVerificationSuccess}
      />

      {/* Debug: Show modal state */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 left-4 bg-red-500 text-white p-2 rounded text-xs">
          Modal: {showOtpModal ? "OPEN" : "CLOSED"} | Email: {userEmail}
        </div>
      )}
    </div>
  );
}
