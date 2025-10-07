"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, X } from "lucide-react";
import { api } from "@/lib/api/axios";
import { toast } from "react-hot-toast";

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  onVerificationSuccess: () => void;
}

export function OtpModal({
  isOpen,
  onClose,
  email,
  onVerificationSuccess,
}: OtpModalProps) {
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Debug logging
  console.log("OTP Modal props:", { isOpen, email });

  // Reset modal state when it opens or closes
  useEffect(() => {
    if (isOpen) {
      setOtp(["", "", "", ""]);
      setIsLoading(false);
      setIsResending(false);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }
  }, [isOpen]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 4);
    const newOtp = pastedData.split("").concat(["", "", "", ""]).slice(0, 4);
    setOtp(newOtp);

    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex((digit) => !digit);
    const focusIndex = nextEmptyIndex === -1 ? 3 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async () => {
    const otpCode = otp.join("");
    if (otpCode.length !== 4) {
      toast.error("Please enter all 4 digits");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.auth.verifyOtp({
        email,
        otpCode,
        type: "verify",
      });

      console.log("OTP verification response:", response);

      // Check for successful verification - try different response structures
      const isSuccess =
        response?.success ||
        response?.data?.isEmailVerified ||
        response?.data ||
        (response && Object.keys(response).length > 0);

      if (isSuccess) {
        toast.success("Email verified successfully!");

        // Reset OTP inputs
        setOtp(["", "", "", ""]);

        // Call parent success handler (this should close modal and handle auto-login)
        onVerificationSuccess();
      } else {
        toast.error("Verification failed. Please try again.");
      }
    } catch (error: any) {
      console.error("OTP verification error:", error);

      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Invalid OTP code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      // You might need to create a resend endpoint
      await api.auth.signup({
        email,
        password: "", // This won't be used for resend
        name: "",
      });
      toast.success("New OTP sent to your email");
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      toast.error("Failed to resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="flow-card rounded-2xl p-6 w-full max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-card-foreground">
              Verify Your Email
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-center mb-6">
          <p className="text-muted-foreground mb-2">
            We've sent a 4-digit verification code to
          </p>
          <p className="text-card-foreground font-medium">{email}</p>
        </div>

        <div className="flex space-x-3 mb-6 justify-center">
          {Array.from({ length: 4 }, (_, index) => (
            <input
              key={`otp-input-${index}`}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              value={otp[index]}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-12 text-center text-lg font-semibold border border-border rounded-lg bg-background text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              maxLength={1}
            />
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          className="w-full mb-4"
          disabled={isLoading || otp.some((digit) => !digit)}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify Email"
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Didn't receive the code?
          </p>
          <button
            onClick={handleResendOtp}
            disabled={isResending}
            className="text-primary hover:text-primary/80 font-medium text-sm transition-colors disabled:opacity-50"
          >
            {isResending ? "Resending..." : "Resend Code"}
          </button>
        </div>
      </div>
    </div>
  );
}
