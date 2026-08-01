"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Filter,
  UserCircle,
  Globe,
  Monitor,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { EmployeeDialog } from "@/components/employee-dialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { startEmployeesListener, stopEmployeesListener, type Employee } from "@/store/slices/employeesSlice";
import { timeAgo } from "@/lib/utils";

export default function EmployeesPage() {
  const dispatch = useAppDispatch();
  const { list: employees, loading } = useAppSelector((s) => s.employees);
  const [search, setSearch] = useState("");
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    dispatch(startEmployeesListener());
    return () => {
      dispatch(stopEmployeesListener());
    };
  }, [dispatch]);

  // Ticking clock to re-evaluate presence (browser close detection)
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  const STALE_MS = 60 * 1000;
  const isActuallyActive = (emp: Employee) =>
    emp.active && emp.lastSeen && now - emp.lastSeen < STALE_MS;

  const filtered = employees.filter((e) =>
    (e.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-zinc-500">Real-time tracking of your SEO and development team</p>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-white pl-10 pr-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Employees</CardTitle>
          <CardDescription>{filtered.length} employees tracked - updates in real-time</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Users className="h-12 w-12 text-zinc-300" />
              <p className="text-sm text-zinc-500">
                No employees found. Install the extension to start tracking.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Role</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden lg:table-cell">Browser</TableHead>
                  <TableHead className="hidden xl:table-cell">Current Tab</TableHead>
                  <TableHead className="hidden sm:table-cell">Last Seen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {(emp.name ?? "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.name || "Unknown"}</p>
                          <p className="text-xs text-zinc-500">{emp.email || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{emp.role || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{emp.department || "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <Monitor className="h-3 w-3 text-zinc-400" />
                        <span className="text-xs">{emp.browser || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {emp.currentTab ? (
                        <div className="flex items-center gap-2 max-w-[200px]">
                          {emp.currentTab.favIconUrl && (
                            <img src={emp.currentTab.favIconUrl} alt="" className="h-4 w-4 rounded" />
                          )}
                          <span className="truncate text-xs text-zinc-500">
                            {emp.currentTab.title || emp.currentTab.url}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400">No tab</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-xs text-zinc-400 sm:table-cell">
                      {timeAgo(emp.lastSeen)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            isActuallyActive(emp) ? "bg-green-500 animate-pulse" : "bg-zinc-400"
                          }`}
                        />
                        <Badge variant={isActuallyActive(emp) ? "success" : "secondary"}>
                          {isActuallyActive(emp) ? "Active" : "Away"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEmp(emp);
                          setDialogOpen(true);
                        }}
                      >
                        <UserCircle className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        employee={selectedEmp}
      />
    </div>
  );
}
