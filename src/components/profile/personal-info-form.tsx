"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/axios";
import {
  updateProfileSchema,
  type UpdateProfileFormData,
} from "@/lib/validations/schemas";
import { toast } from "react-hot-toast";

interface PersonalInfoFormProps {
  readonly user: {
    id: string;
    name: string;
    email: string;
    bio?: string;
  };
  readonly onUpdate: (userData: any) => void;
}

export function PersonalInfoForm({ user, onUpdate }: PersonalInfoFormProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user.name || "",
      email: user.email || "",
      bio: user.bio || "",
    },
  });

  const onSubmit = async (data: UpdateProfileFormData) => {
    setIsUpdating(true);
    try {
      const response = await api.users.updateProfile(user.id, {
        name: data.firstName,
        email: data.email,
        bio: data.bio,
      });

      const updatedUser = response.data || response;
      onUpdate(updatedUser);
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Profile update error:", error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flow-card p-6">
      <div className="flex items-center space-x-2 mb-6">
        <User className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-card-foreground">
          Personal Information
        </h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Full Name</Label>
          <Input
            id="firstName"
            {...register("firstName")}
            className={errors.firstName ? "border-red-500" : ""}
          />
          {errors.firstName && (
            <p className="text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-email">Email Address</Label>
          <Input
            id="profile-email"
            type="email"
            {...register("email")}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Changing your email may require verification
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            placeholder="Tell us about yourself..."
            {...register("bio")}
            className={errors.bio ? "border-red-500" : ""}
            rows={4}
          />
          {errors.bio && (
            <p className="text-sm text-red-600">{errors.bio.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Brief description about yourself (max 500 characters)
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={isUpdating}>
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving Changes...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
