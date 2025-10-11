"use client";

import { useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/axios";
import { toast } from "react-hot-toast";

interface ProfilePictureProps {
  readonly user: {
    readonly id: string;
    readonly name: string;
    readonly profilePicture?: string;
  };
  readonly onImageUpdate: (imageUrl: string | undefined) => void;
}

export function ProfilePicture({ user, onImageUpdate }: ProfilePictureProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("profileImage", file); // Changed to match backend DTO

      // Debug: Log the formData contents
      console.log("FormData contents:");
      for (let [key, value] of formData.entries()) {
        console.log(key, value);
      }
      console.log("File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
      });

      const response = await api.users.uploadProfileImage(user.id, formData);

      console.log("Upload response:", response);

      // Backend returns the User object directly with profilePicture field
      const imageUrl = response.profilePicture;

      if (imageUrl) {
        onImageUpdate(imageUrl);
        toast.success("Profile picture updated!");
      } else {
        console.warn("No profile picture URL found in response:", response);
        toast.error("Upload successful but couldn't get image URL");
      }
    } catch (error: any) {
      console.error("Image upload error:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });

      // More specific error messages
      if (error.response?.status === 400) {
        const errorMessage =
          error.response?.data?.message || "Invalid file format or size";
        toast.error(`Upload failed: ${errorMessage}`);
      } else {
        toast.error("Failed to upload image");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user.profilePicture) return;

    try {
      await api.users.removeProfileImage(user.id);
      onImageUpdate(undefined);
      toast.success("Profile picture removed!");
    } catch (error) {
      console.error("Image removal error:", error);
      toast.error("Failed to remove image");
    }
  };

  return (
    <div className="flow-card p-6">
      <div className="flex items-center space-x-2 mb-6">
        <User className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-card-foreground">
          Profile Picture
        </h2>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-16 w-16 text-muted-foreground" />
            )}
          </div>

          {isUploadingImage && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <label htmlFor="profile-image" className="cursor-pointer">
            <Button
              variant="outline"
              size="sm"
              disabled={isUploadingImage}
              asChild
            >
              <span>
                <Camera className="h-4 w-4 mr-2" />
                Upload New
              </span>
            </Button>
          </label>

          {user.profilePicture && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveImage}
              disabled={isUploadingImage}
            >
              Remove
            </Button>
          )}
        </div>

        <input
          id="profile-image"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <p className="text-xs text-muted-foreground text-center">
          Supported formats: JPG, PNG, GIF (max 5MB)
        </p>
      </div>
    </div>
  );
}
