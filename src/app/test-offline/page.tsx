"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  OfflineStatusBar,
  OfflineIndicator,
  OfflineBadge,
} from "@/components/offline/offline-status";
import { useNetworkStatus } from "@/lib/offline-api";
import { offlineDB } from "@/lib/offline-db";
import SyncDebugger from "@/components/test/SyncDebugger";
import type {
  TaskWithSync,
  ProfileWithSync,
  TeamWithSync,
} from "@/lib/offline-db";

type TaskCreate = Omit<
  TaskWithSync,
  "id" | "createdAt" | "updatedAt" | "_syncStatus" | "_localId"
>;
type ProfileCreate = Omit<
  ProfileWithSync,
  "id" | "createdAt" | "updatedAt" | "_cacheTimestamp" | "_syncStatus"
>;
type TeamCreate = Omit<
  TeamWithSync,
  "id" | "createdAt" | "updatedAt" | "_cacheTimestamp" | "_syncStatus"
>;

export default function TestOfflinePage() {
  const isOnline = useNetworkStatus();
  const [tasks, setTasks] = useState<TaskWithSync[]>([]);
  const [profiles, setProfiles] = useState<ProfileWithSync[]>([]);
  const [teams, setTeams] = useState<TeamWithSync[]>([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM" as const,
  });
  const [newProfile, setNewProfile] = useState({
    name: "",
    email: "",
    role: "member",
  });
  const [newTeam, setNewTeam] = useState({ name: "", description: "" });

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tasksData, profilesData, teamsData] = await Promise.all([
          offlineDB.getAllTasks(),
          offlineDB.getAllProfiles(),
          offlineDB.getAllTeams(),
        ]);
        setTasks(tasksData);
        setProfiles(profilesData);
        setTeams(teamsData);
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, []);

  const createTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      const task: TaskCreate = {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: "TODO",
        assignedTo: undefined,
        teamId: undefined,
        dueDate: undefined,
      };

      const createdTask = await offlineDB.createTask(task);
      setTasks((prev) => [...prev, createdTask]);
      setNewTask({ title: "", description: "", priority: "MEDIUM" });
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const createProfile = async () => {
    if (!newProfile.name.trim() || !newProfile.email.trim()) return;

    try {
      const profile: ProfileCreate = {
        name: newProfile.name,
        email: newProfile.email,
        profilePicture: undefined,
        role: newProfile.role,
      };

      const createdProfile = await offlineDB.createProfile(profile);
      setProfiles((prev) => [...prev, createdProfile]);
      setNewProfile({ name: "", email: "", role: "member" });
    } catch (error) {
      console.error("Error creating profile:", error);
    }
  };

  const createTeam = async () => {
    if (!newTeam.name.trim()) return;

    try {
      const team: TeamCreate = {
        name: newTeam.name,
        description: newTeam.description,
        members: [],
      };

      const createdTeam = await offlineDB.createTeam(team);
      setTeams((prev) => [...prev, createdTeam]);
      setNewTeam({ name: "", description: "" });
    } catch (error) {
      console.error("Error creating team:", error);
    }
  };

  const toggleTaskStatus = async (taskId: string) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const newStatus = task.status === "DONE" ? "TODO" : "DONE";
      const updatedTask = await offlineDB.updateTask(taskId, {
        status: newStatus,
      });

      setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await offlineDB.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <OfflineIndicator />

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Offline Mode Test</h1>
        <OfflineStatusBar showDetails />
      </div>

      <SyncDebugger />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Tasks
              <OfflineBadge />
              <Badge variant="outline">{tasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create Task Form */}
            <div className="space-y-2">
              <Input
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <Textarea
                placeholder="Task description"
                value={newTask.description}
                onChange={(e) =>
                  setNewTask((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={2}
              />
              <select
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask((prev) => ({
                    ...prev,
                    priority: e.target.value as any,
                  }))
                }
                className="w-full p-2 border rounded"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
              </select>
              <Button onClick={createTask} className="w-full">
                Create Task
              </Button>
            </div>

            {/* Tasks List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tasks.map((task) => (
                <div key={task.id} className="p-3 border rounded space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4
                        className={`font-medium ${
                          task.status === "DONE"
                            ? "line-through text-gray-500"
                            : ""
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-gray-600">
                          {task.description}
                        </p>
                      )}
                    </div>
                    {(() => {
                      const priority = task.priority;
                      let variant: "destructive" | "default" | "secondary";

                      if (priority === "HIGH") {
                        variant = "destructive";
                      } else if (priority === "MEDIUM") {
                        variant = "default";
                      } else {
                        variant = "secondary";
                      }

                      return (
                        <Badge variant={variant}>
                          {priority.toLowerCase()}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleTaskStatus(task.id)}
                    >
                      {task.status === "DONE" ? "Mark Pending" : "Complete"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteTask(task.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <p className="text-gray-500 text-center py-4">No tasks yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profiles Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Profiles
              <OfflineBadge />
              <Badge variant="outline">{profiles.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create Profile Form */}
            <div className="space-y-2">
              <Input
                placeholder="Name"
                value={newProfile.name}
                onChange={(e) =>
                  setNewProfile((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <Input
                placeholder="Email"
                type="email"
                value={newProfile.email}
                onChange={(e) =>
                  setNewProfile((prev) => ({ ...prev, email: e.target.value }))
                }
              />
              <select
                value={newProfile.role}
                onChange={(e) =>
                  setNewProfile((prev) => ({
                    ...prev,
                    role: e.target.value as any,
                  }))
                }
                className="w-full p-2 border rounded"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
              <Button onClick={createProfile} className="w-full">
                Create Profile
              </Button>
            </div>

            {/* Profiles List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {profiles.map((profile) => (
                <div key={profile.id} className="p-3 border rounded">
                  <h4 className="font-medium">{profile.name}</h4>
                  <p className="text-sm text-gray-600">{profile.email}</p>
                  <Badge variant="outline">{profile.role}</Badge>
                </div>
              ))}
              {profiles.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No profiles yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Teams Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Teams
              <OfflineBadge />
              <Badge variant="outline">{teams.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Create Team Form */}
            <div className="space-y-2">
              <Input
                placeholder="Team name"
                value={newTeam.name}
                onChange={(e) =>
                  setNewTeam((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              <Textarea
                placeholder="Team description"
                value={newTeam.description}
                onChange={(e) =>
                  setNewTeam((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={2}
              />
              <Button onClick={createTeam} className="w-full">
                Create Team
              </Button>
            </div>

            {/* Teams List */}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {teams.map((team) => (
                <div key={team.id} className="p-3 border rounded">
                  <h4 className="font-medium">{team.name}</h4>
                  {team.description && (
                    <p className="text-sm text-gray-600">{team.description}</p>
                  )}
                  <Badge variant="outline">{team.members.length} members</Badge>
                </div>
              ))}
              {teams.length === 0 && (
                <p className="text-gray-500 text-center py-4">No teams yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <strong>Network:</strong> {isOnline ? "Online" : "Offline"}
            </div>
            <div>
              <strong>Tasks:</strong> {tasks.length}
            </div>
            <div>
              <strong>Profiles:</strong> {profiles.length}
            </div>
            <div>
              <strong>Teams:</strong> {teams.length}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
