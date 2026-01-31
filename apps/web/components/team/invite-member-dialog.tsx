"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEntityAuth } from "@/lib/auth";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useAction } from "convex/react";
import { Loader2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect, useRef } from "react";

interface InviteMemberDialogProps {
  companyId: Id<"companies">;
}

interface SearchResult {
  id: string;
  email?: string;
  username?: string;
  imageUrl?: string;
}

export function InviteMemberDialog({ companyId }: InviteMemberDialogProps) {
  const t = useTranslations("team");
  const { getToken } = useEntityAuth();

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [role, setRole] = useState<"admin" | "viewer">("viewer");
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const searchUsersAction = useAction(api.members.actions.searchUsersForInvite);
  const inviteUserAction = useAction(api.members.actions.inviteUser);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search as you type
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError("Not authenticated");
          setIsSearching(false);
          return;
        }

        const results = await searchUsersAction({
          query: trimmed,
          accessToken: token,
        });

        setSearchResults(results);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, getToken, searchUsersAction]);

  const handleInvite = async () => {
    if (!selectedUser) return;

    setIsInviting(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      await inviteUserAction({
        companyId,
        inviteeUserId: selectedUser.id,
        role,
        accessToken: token,
      });

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation failed");
    } finally {
      setIsInviting(false);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setRole("viewer");
    setError(null);
    setSuccess(false);
  };

  const getInitials = (username?: string, email?: string) => {
    if (username) {
      return username.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email[0]?.toUpperCase() || "?";
    }
    return "?";
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          {t("inviteMember")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invite.title")}</DialogTitle>
          <DialogDescription>{t("invite.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedUser ? (
            <>
              <div className="relative">
                <Input
                  placeholder={t("invite.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                      onClick={() => setSelectedUser(user)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.imageUrl} />
                        <AvatarFallback>
                          {getInitials(user.username, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {user.username || "Unknown"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.length >= 2 &&
                !isSearching &&
                searchResults.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("invite.noResults")}
                  </p>
                )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.imageUrl} />
                  <AvatarFallback>
                    {getInitials(selectedUser.username, selectedUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {selectedUser.username || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedUser.email}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  Change
                </Button>
              </div>

              <div className="space-y-2">
                <Label>{t("invite.selectRole")}</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value as "admin" | "viewer")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex flex-col">
                        <span>{t("roles.admin")}</span>
                        <span className="text-xs text-muted-foreground">
                          {t("roleDescriptions.admin")}
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <div className="flex flex-col">
                        <span>{t("roles.viewer")}</span>
                        <span className="text-xs text-muted-foreground">
                          {t("roleDescriptions.viewer")}
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950 px-3 py-2 rounded">
              {t("invite.success")}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!selectedUser || isInviting || success}
              onClick={handleInvite}
            >
              {isInviting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("invite.inviting")}
                </>
              ) : (
                t("invite.invite")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
