
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useWikiPages } from "@/hooks/wiki/useWikiPages";
import { useProfiles } from "@/hooks/useProfiles";
import { useTeamsList } from "@/hooks/useTeamsList";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Permissions = {
  view: string[];
  edit: string[];
};

type OrgRole = {
  id: string;
  title: string;
};

type ProcessPermissionsModalProps = {
  open: boolean;
  onClose: () => void;
  pageId: string;
  permissions: Permissions | null;
  ownerId: string;
  visibilityType?: string;
  teams?: string[];
  roles?: string[];
};

const ROLES_FALLBACK = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "member", label: "Member" },
  { value: "inactive", label: "Inactive" }
];

export default function ProcessPermissionsModal({
  open,
  onClose,
  pageId,
  permissions,
  ownerId,
  visibilityType,
  teams = [],
  roles = []
}: ProcessPermissionsModalProps) {
  const { setPagePermissions, setPageVisibility } = useWikiPages();
  const { profiles } = useProfiles();
  const { teams: availableTeams } = useTeamsList();
  const [selectedType, setSelectedType] = useState<string>(visibilityType || "people");
  const [teamList, setTeamList] = useState<string[]>(teams);
  const [roleList, setRoleList] = useState<string[]>(roles);
  const [viewIds, setViewIds] = useState<string[]>(permissions?.view || []);
  const [editIds, setEditIds] = useState<string[]>(permissions?.edit || []);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [permType, setPermType] = useState<"view" | "edit">("view");
  const [positionIds, setPositionIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch org roles/positions for "By Position"
  const { data: orgRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ["org_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("org_roles").select("id, title").order("title");
      if (error) throw error;
      return data as OrgRole[];
    }
  });

  useEffect(() => {
    setSelectedType(visibilityType || "people");
  }, [visibilityType, open]);

  // Add by email (people)
  const handleAdd = () => {
    if (!newEmail) return;
    const profile = profiles.find((p: any) => p.email === newEmail.trim());
    if (!profile) return alert("User not found");
    if (permType === "view") setViewIds(ids => [...new Set([...ids, profile.id])]);
    else setEditIds(ids => [...new Set([...ids, profile.id])]);
    setNewEmail("");
  };
  const handleRemove = (uid: string, type: "view" | "edit") => {
    if (type === "view") setViewIds(ids => ids.filter(id => id !== uid));
    else setEditIds(ids => ids.filter(id => id !== uid));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedType === "people") {
        await setPagePermissions({
          id: pageId,
          permissions: { view: viewIds, edit: editIds },
          visibilityType: "people"
        });
      } else if (selectedType === "everyone") {
        await setPageVisibility({ id: pageId, type: "everyone" });
      } else if (selectedType === "teams") {
        await setPageVisibility({ id: pageId, type: "teams", teams: teamList });
      } else if (selectedType === "roles") {
        await setPageVisibility({ id: pageId, type: "roles", positions: positionIds });
      }
      setSaving(false);
      onClose();
      toast({ title: "Success!", description: "Permissions updated." });
    } catch (err: any) {
      setSaving(false);
      toast({ title: "Error", description: "Could not update permissions. Try again." });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Page Visibility</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex gap-2 mb-3 flex-wrap">
            <label><input type="radio" checked={selectedType === "everyone"} onChange={() => setSelectedType("everyone")} /> Public (Everyone)</label>
            <label><input type="radio" checked={selectedType === "teams"} onChange={() => setSelectedType("teams")} /> Teams Only</label>
            <label><input type="radio" checked={selectedType === "people"} onChange={() => setSelectedType("people")} /> People Only</label>
            <label><input type="radio" checked={selectedType === "roles"} onChange={() => setSelectedType("roles")} /> By Position</label>
          </div>

          {selectedType === "teams" && (
            <div>
              <div className="font-medium mb-1">Visible to Teams:</div>
              <select
                multiple
                value={teamList}
                onChange={e => setTeamList(Array.from(e.target.selectedOptions, o => o.value))}
                className="w-full px-2 py-1 border rounded"
              >
                {availableTeams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <div className="text-xs mt-1 text-muted-foreground">Hold Ctrl/Cmd to select multiple teams.</div>
            </div>
          )}

          {selectedType === "roles" && (
            <div>
              <div className="font-medium mb-1">Visible to Positions:</div>
              <select
                multiple
                value={positionIds}
                onChange={e => setPositionIds(Array.from(e.target.selectedOptions, o => o.value))}
                className="w-full px-2 py-1 border rounded"
              >
                {(orgRoles ?? ROLES_FALLBACK).map(role => (
                  <option key={role.id} value={role.id}>{role.title || role.label}</option>
                ))}
              </select>
              <div className="text-xs mt-1 text-muted-foreground">Hold Ctrl/Cmd to select multiple positions.</div>
            </div>
          )}

          {selectedType === "people" && (
            <div>
              <div className="font-semibold mb-1">Viewers:</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {viewIds.map(uid => (
                  <span key={uid} className="flex items-center bg-muted rounded px-2 py-0.5 text-xs">
                    {profiles.find((p: any) => p.id === uid)?.full_name || uid}
                    <Button variant="ghost" size="icon" aria-label="Remove viewer" onClick={() => handleRemove(uid, "view")}>×</Button>
                  </span>
                ))}
              </div>
              <div className="font-semibold mb-1 mt-2">Editors:</div>
              <div className="flex flex-wrap gap-1 mb-2">
                {editIds.map(uid => (
                  <span key={uid} className="flex items-center bg-muted rounded px-2 py-0.5 text-xs">
                    {profiles.find((p: any) => p.id === uid)?.full_name || uid}
                    <Button variant="ghost" size="icon" aria-label="Remove editor" onClick={() => handleRemove(uid, "edit")}>×</Button>
                  </span>
                ))}
              </div>
              <div className="flex mt-3 gap-1">
                <input
                  type="text"
                  placeholder="User email…"
                  className="border rounded px-2 py-1 flex-1"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                />
                <select className="border rounded px-1 py-1" value={permType}
                  onChange={e => setPermType(e.target.value as any)}>
                  <option value="view">Viewer</option>
                  <option value="edit">Editor</option>
                </select>
                <Button type="button" size="sm" onClick={handleAdd}>Add</Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="mt-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
