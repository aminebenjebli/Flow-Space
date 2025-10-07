"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, CheckCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OtpModal } from "@/components/auth/otp-modal";
import { api } from "@/lib/api/axios";
import { toast } from "react-hot-toast";

export default function VerifyPage() {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
      setShowOtpModal(true);
    }
  }, [searchParams]);

  const handleVerificationSuccess = async () => {
    setShowOtpModal(false);
    setIsVerified(true);
    toast.success("Email verified successfully!");

    // Redirect to login page after 2 seconds
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  const handleResendCode = async () => {
    if (!email) {
      toast.error("Please provide your email address");
      return;
    }

    setIsLoading(true);
    try {
      // You might need a dedicated resend endpoint
      await api.auth.signup({
        email,
        password: "",
        name: "",
      });
      toast.success("Verification code sent to your email");
      setShowOtpModal(true);
    } catch (error: any) {
      console.error("Resend error:", error);
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4">
        <div className="flow-card rounded-2xl p-8 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-card-foreground mb-4">
            Email Verified!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your email has been successfully verified. You will be redirected to
            the login page shortly.
          </p>
          <Link href="/login">
            <Button className="w-full">Continue to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900 flex items-center justify-center p-4">
      <div className="flow-card rounded-2xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>

        <h1 className="text-2xl font-bold text-card-foreground mb-4">
          Verify Your Email
        </h1>

        <p className="text-muted-foreground mb-6">
          We've sent a verification code to your email address. Please check
          your inbox and enter the code to verify your account.
        </p>

        {email && (
          <p className="text-sm text-card-foreground font-medium mb-6">
            Email: {email}
          </p>
        )}

        <div className="space-y-4">
          <Button
            onClick={() => setShowOtpModal(true)}
            className="w-full"
            disabled={!email}
          >
            Enter Verification Code
          </Button>

          <Button
            onClick={handleResendCode}
            variant="outline"
            className="w-full"
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Resend Code"
            )}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Already verified?{" "}
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
        onClose={() => setShowOtpModal(false)}
        email={email}
        onVerificationSuccess={handleVerificationSuccess}
      />
    </div>
  );
}
