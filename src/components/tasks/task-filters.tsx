"use client";

import { useState } from "react";
import { Search, Filter, X, ChevronDown } from "lucide-react";
import { useTask } from "@/contexts/task-context";
import { TaskStatus, TaskPriority, QueryTaskDto } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function TaskFilters() {
  const { filters, setFilters, fetchTasks } = useTask();
  const [searchQuery, setSearchQuery] = useState(filters.search || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const newFilters = { ...filters, search: query, page: 1 };
    setFilters(newFilters);
    fetchTasks(newFilters);
  };

  const handleStatusFilter = (status?: TaskStatus) => {
    const newFilters = { ...filters, status, page: 1 };
    setFilters(newFilters);
    fetchTasks(newFilters);
  };

  const handlePriorityFilter = (priority?: TaskPriority) => {
    const newFilters = { ...filters, priority, page: 1 };
    setFilters(newFilters);
    fetchTasks(newFilters);
  };

  const handleDateFilter = (field: "dueFrom" | "dueUntil", value: string) => {
    const newFilters = { ...filters, [field]: value || undefined, page: 1 };
    setFilters(newFilters);
    fetchTasks(newFilters);
  };

  const handleSortChange = (field: string, direction: "asc" | "desc") => {
    const newFilters = {
      ...filters,
      sortBy: field,
      sortOrder: direction,
      page: 1,
    };
    setFilters(newFilters);
    fetchTasks(newFilters);
  };

  const clearFilters = () => {
    const newFilters: QueryTaskDto = { page: 1, limit: filters.limit };
    setFilters(newFilters);
    setSearchQuery("");
    fetchTasks(newFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.priority) count++;
    if (filters.search) count++;
    if (filters.dueFrom) count++;
    if (filters.dueUntil) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="flow-card p-6 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={!filters.status ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter()}
          >
            All
          </Button>
          <Button
            variant={filters.status === TaskStatus.TODO ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter(TaskStatus.TODO)}
          >
            To Do
          </Button>
          <Button
            variant={
              filters.status === TaskStatus.IN_PROGRESS ? "default" : "outline"
            }
            size="sm"
            onClick={() => handleStatusFilter(TaskStatus.IN_PROGRESS)}
          >
            In Progress
          </Button>
          <Button
            variant={filters.status === TaskStatus.DONE ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter(TaskStatus.DONE)}
          >
            Done
          </Button>
          <Button
            variant={
              filters.status === TaskStatus.CANCELLED ? "default" : "outline"
            }
            size="sm"
            onClick={() => handleStatusFilter(TaskStatus.CANCELLED)}
          >
            Cancelled
          </Button>
        </div>

        {/* More Filters Button */}
        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Advanced Filters</h4>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              </div>

              {/* Priority Filter */}
              <div>
                <label
                  htmlFor="priority-select"
                  className="text-sm font-medium mb-2 block"
                >
                  Priority
                </label>
                <Select
                  value={filters.priority || "all"}
                  onValueChange={(value) =>
                    handlePriorityFilter(
                      value === "all" ? undefined : (value as TaskPriority)
                    )
                  }
                >
                  <SelectTrigger id="priority-select">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
                    <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
                    <SelectItem value={TaskPriority.URGENT}>Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Filters */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="due-from"
                    className="text-sm font-medium mb-2 block"
                  >
                    Due From
                  </label>
                  <Input
                    id="due-from"
                    type="date"
                    value={filters.dueFrom || ""}
                    onChange={(e) =>
                      handleDateFilter("dueFrom", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="due-until"
                    className="text-sm font-medium mb-2 block"
                  >
                    Due Until
                  </label>
                  <Input
                    id="due-until"
                    type="date"
                    value={filters.dueUntil || ""}
                    onChange={(e) =>
                      handleDateFilter("dueUntil", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Sort Options */}
              <div>
                <div className="text-sm font-medium mb-2">Sort By</div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={filters.sortBy || "createdAt"}
                    onValueChange={(value) =>
                      handleSortChange(value, filters.sortOrder || "desc")
                    }
                  >
                    <SelectTrigger aria-label="Sort field">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Created Date</SelectItem>
                      <SelectItem value="updatedAt">Updated Date</SelectItem>
                      <SelectItem value="dueDate">Due Date</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="title">Title</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sortOrder || "desc"}
                    onValueChange={(value) =>
                      handleSortChange(
                        filters.sortBy || "createdAt",
                        value as "asc" | "desc"
                      )
                    }
                  >
                    <SelectTrigger aria-label="Sort order">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleSearch("")}
              />
            </Badge>
          )}
          {filters.priority && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Priority: {filters.priority}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handlePriorityFilter()}
              />
            </Badge>
          )}
          {filters.dueFrom && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Due from: {filters.dueFrom}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleDateFilter("dueFrom", "")}
              />
            </Badge>
          )}
          {filters.dueUntil && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Due until: {filters.dueUntil}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleDateFilter("dueUntil", "")}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
