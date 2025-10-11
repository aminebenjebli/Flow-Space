"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/axios";
import { useProfile } from "@/contexts/profile-context";
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from "@/lib/validations/schemas";
import { toast } from "react-hot-toast";

export function PasswordChangeForm() {
  const [isChanging, setIsChanging] = useState(false);
  const { profile } = useProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    if (!profile?.id) {
      toast.error("User not found");
      return;
    }

    setIsChanging(true);
    try {
      await api.users.changePassword(profile.id, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      toast.success("Password changed successfully!");
      reset();
    } catch (error: any) {
      console.error("Password change error:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to change password");
      }
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="flow-card p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Lock className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-card-foreground">
          Change Password
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            {...register("currentPassword")}
            className={errors.currentPassword ? "border-red-500" : ""}
          />
          {errors.currentPassword && (
            <p className="text-sm text-red-600">
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            {...register("newPassword")}
            className={errors.newPassword ? "border-red-500" : ""}
          />
          {errors.newPassword && (
            <p className="text-sm text-red-600">{errors.newPassword.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            {...register("confirmPassword")}
            className={errors.confirmPassword ? "border-red-500" : ""}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isChanging}>
          {isChanging ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Changing Password...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Change Password
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
