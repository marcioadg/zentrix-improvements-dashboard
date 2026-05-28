
import React from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompanyTrainingOverview } from "@/hooks/useCompanyTrainingOverview";

// Render the company-wide User Training Matrix
const UserTrainingMatrix: React.FC = () => {
  const { data, isLoading, error } = useCompanyTrainingOverview();

  // Group the rows by user
  const users = React.useMemo(() => {
    if (!data) return [];
    const grouped: Record<
      string,
      {
        user_id: string;
        full_name: string;
        email: string;
        assignments: Array<{
          assignment_id: string;
          playbook_title: string;
          progress_percentage: number;
        }>;
      }
    > = {};

    for (const row of data) {
      if (!grouped[row.user_id]) {
        grouped[row.user_id] = {
          user_id: row.user_id,
          full_name: row.full_name,
          email: row.email,
          assignments: [],
        };
      }
      if (row.playbook_id) {
        grouped[row.user_id].assignments.push({
          assignment_id: row.assignment_id,
          playbook_title: row.playbook_title || "",
          progress_percentage: row.progress_percentage ?? 0,
        });
      }
    }
    return Object.values(grouped);
  }, [data]);

  return (
    <Card className="mt-2">
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">User Training Matrix</h2>
        {isLoading ? (
          <div className="text-center p-8">Loading user training matrix…</div>
        ) : error ? (
          <div className="text-center p-8 text-destructive">
            Error: {error.message}
          </div>
        ) : (
          <ScrollArea className="max-h-[28rem] sm:max-h-[36rem] min-w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-2 text-left font-semibold">
                    User
                  </TableHead>
                  <TableHead className="px-4 py-2 text-left">Email</TableHead>
                  <TableHead className="px-4 py-2 text-right">
                    Assigned Trainings
                  </TableHead>
                  <TableHead className="px-4 py-2 text-right">% Completed</TableHead>
                  <TableHead className="px-4 py-2 text-left">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="p-6 text-center text-muted-foreground"
                    >
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const total = user.assignments.length;
                    const completed = user.assignments.filter(
                      (pb) => pb.progress_percentage >= 100
                    ).length;
                    // If the user has no assignments, pct is undefined
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    let status = "On Track";
                    if (pct === 100 && total > 0) status = "Completed";
                    else if (pct < 60 && total > 0) status = "Behind";
                    else if (total === 0) status = "No assignments";
                    return (
                      <TableRow key={user.user_id}>
                        <TableCell className="px-4 py-2">{user.full_name}</TableCell>
                        <TableCell className="px-4 py-2">{user.email}</TableCell>
                        <TableCell className="px-4 py-2 text-right">{total}</TableCell>
                        <TableCell className="px-4 py-2 text-right">
                          {total > 0 ? `${pct}%` : "--"}
                        </TableCell>
                        <TableCell className="px-4 py-2">{status}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
};

export default UserTrainingMatrix;
