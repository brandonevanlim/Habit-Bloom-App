import { useState, useEffect, useRef } from "react";
import { useApp } from "@/hooks/useAppState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toDateKey } from "@/lib/habits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, UserPlus, UserCheck, UserX, RefreshCw,
  Loader2, Trophy, Users, Swords, Copy, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FriendEntry {
  friendshipId: string;
  userId: string;
  displayName: string;
  habitsDoneToday: number;
  lastStatsDate: string | null;
}

interface RequestEntry {
  friendshipId: string;
  userId: string;
  displayName: string;
}

interface SearchResult {
  userId: string;
  displayName: string;
  characterName: string;
  friendCode: string | null;
}

interface ChallengeMember {
  userId: string;
  displayName: string;
  totalDone: number;
  lastCompletedDate: string | null;
}

interface ChallengeData {
  id: string;
  creatorId: string;
  title: string;
  emoji: string;
  durationDays: number;
  startsAt: string;
  endsAt: string;
  inviteCode: string;
  members: ChallengeMember[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEDALS = ["🥇", "🥈", "🥉"];
const INVITE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const genCode = () =>
  Array.from({ length: 6 }, () =>
    INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)]
  ).join("");

const Avatar = ({ name }: { name: string }) => (
  <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
    {(name || "?").charAt(0).toUpperCase()}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const FriendsPage = () => {
  const { habits, user } = useApp();
  const { user: authUser } = useAuth();
  const uid = authUser?.id ?? "";

  const [tab, setTab] = useState<"league" | "challenges">("league");

  // Friends state
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<RequestEntry[]>([]);
  const [outgoingIds, setOutgoingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  // Challenge state
  const [challenges, setChallenges] = useState<ChallengeData[]>([]);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const challengeLoaded = useRef(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("🏆");
  const [newDuration, setNewDuration] = useState(30);
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const todayKey = toDateKey(new Date());
  const myDoneToday = habits.filter(h => h.completions.includes(todayKey)).length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any; // challenges/challenge_members not yet in generated types

  // ─── Load friends ───────────────────────────────────────────────────────────

  const loadFriends = async (quiet = false) => {
    if (!uid) return;
    if (quiet) setRefreshing(true); else setLoading(true);

    try {
      const { data: fs } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);

      const acceptedIds: string[] = [];
      const fsIdMap = new Map<string, string>();
      const incoming: { id: string; userId: string }[] = [];
      const outgoing = new Set<string>();

      for (const f of fs ?? []) {
        const otherId = f.requester_id === uid ? f.addressee_id : f.requester_id;
        if (f.status === "accepted") {
          acceptedIds.push(otherId);
          fsIdMap.set(otherId, f.id);
        } else if (f.status === "pending") {
          if (f.addressee_id === uid) incoming.push({ id: f.id, userId: f.requester_id });
          else outgoing.add(f.addressee_id);
        }
      }

      setOutgoingIds(outgoing);

      if (acceptedIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, habits_done_today, last_stats_date")
          .in("user_id", acceptedIds);

        setFriends(
          profiles?.map(p => ({
            friendshipId: fsIdMap.get(p.user_id) ?? "",
            userId: p.user_id,
            displayName: p.display_name || "Unnamed",
            habitsDoneToday: p.last_stats_date === todayKey ? (p.habits_done_today ?? 0) : 0,
            lastStatsDate: p.last_stats_date,
          })) ?? []
        );
      } else {
        setFriends([]);
      }

      if (incoming.length > 0) {
        const { data: reqProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", incoming.map(r => r.userId));

        setIncomingRequests(
          incoming.map(r => ({
            friendshipId: r.id,
            userId: r.userId,
            displayName: reqProfiles?.find(p => p.user_id === r.userId)?.display_name || "Unnamed",
          }))
        );
      } else {
        setIncomingRequests([]);
      }
    } catch (err) {
      console.error("Friends load error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadFriends(); }, [uid]); // eslint-disable-line

  // ─── Load challenges ────────────────────────────────────────────────────────

  const loadChallenges = async (quiet = false) => {
    if (!uid) return;
    if (!quiet) setChallengeLoading(true);

    try {
      const { data: myMem } = await db
        .from("challenge_members")
        .select("challenge_id, total_done, last_completed_date")
        .eq("user_id", uid);

      if (!myMem?.length) { setChallenges([]); return; }

      const cids = myMem.map((m: any) => m.challenge_id); // eslint-disable-line @typescript-eslint/no-explicit-any

      const { data: cData } = await db
        .from("challenges")
        .select("*")
        .in("id", cids)
        .gte("ends_at", todayKey)
        .order("created_at", { ascending: false });

      if (!cData?.length) { setChallenges([]); return; }

      const activeCids = cData.map((c: any) => c.id); // eslint-disable-line

      const { data: allMem } = await db
        .from("challenge_members")
        .select("challenge_id, user_id, total_done, last_completed_date")
        .in("challenge_id", activeCids);

      const memberUids = [...new Set<string>((allMem ?? []).map((m: any) => m.user_id as string))]; // eslint-disable-line
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", memberUids);

      const nameMap = new Map(profiles?.map(p => [p.user_id, p.display_name || "Unnamed"]) ?? []);

      setChallenges(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cData.map((c: any) => ({
          id: c.id,
          creatorId: c.creator_id,
          title: c.title,
          emoji: c.emoji || "🏆",
          durationDays: c.duration_days,
          startsAt: c.starts_at,
          endsAt: c.ends_at,
          inviteCode: c.invite_code,
          members: (allMem ?? [])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((m: any) => m.challenge_id === c.id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((m: any) => ({
              userId: m.user_id,
              displayName: nameMap.get(m.user_id) ?? "Unnamed",
              totalDone: m.total_done,
              lastCompletedDate: m.last_completed_date ?? null,
            }))
            .sort((a: ChallengeMember, b: ChallengeMember) => b.totalDone - a.totalDone),
        }))
      );
    } catch (err) {
      console.error("Challenges load error:", err);
      setChallenges([]);
    } finally {
      setChallengeLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "challenges" && !challengeLoaded.current && uid) {
      challengeLoaded.current = true;
      loadChallenges();
    }
  }, [tab, uid]); // eslint-disable-line

  // ─── Debounced search ───────────────────────────────────────────────────────

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query.trim();
        const qCode = q.toUpperCase().replace(/\s/g, "");

        const [byName, byCode] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, display_name, character_name, friend_code")
            .ilike("display_name", `%${q}%`)
            .neq("user_id", uid)
            .limit(8),
          supabase
            .from("profiles")
            .select("user_id, display_name, character_name, friend_code")
            .eq("friend_code", qCode)
            .neq("user_id", uid)
            .limit(1),
        ]);

        const seen = new Set<string>();
        const merged = [...(byCode.data ?? []), ...(byName.data ?? [])].filter(p => {
          if (seen.has(p.user_id)) return false;
          seen.add(p.user_id);
          return true;
        });

        setSearchResults(
          merged.map(p => ({
            userId: p.user_id,
            displayName: (p.display_name as string | null) || "Unnamed",
            characterName: (p.character_name as string | null) || "Sprout",
            friendCode: (p.friend_code as string | null) ?? null,
          }))
        );
      } finally {
        setSearching(false);
      }
    }, 400);
  }, [query, uid]); // eslint-disable-line

  // ─── Friend actions ─────────────────────────────────────────────────────────

  const sendRequest = async (targetId: string) => {
    const incomingFromTarget = incomingRequests.find(r => r.userId === targetId);
    if (incomingFromTarget) { await acceptRequest(incomingFromTarget.friendshipId); return; }

    const { error } = await supabase.from("friendships").insert({
      requester_id: uid, addressee_id: targetId, status: "pending",
    });
    if (error) { toast.error("Could not send request"); return; }
    setOutgoingIds(prev => new Set([...prev, targetId]));
    toast.success("Friend request sent! 👋");
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    toast.success("Friend added! 🎉");
    loadFriends(true);
  };

  const declineRequest = async (friendshipId: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setIncomingRequests(prev => prev.filter(r => r.friendshipId !== friendshipId));
  };

  const removeFriend = async (friendshipId: string, name: string) => {
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId));
    toast.success(`Removed ${name}`);
  };

  // ─── Challenge actions ──────────────────────────────────────────────────────

  const createChallenge = async () => {
    if (!newTitle.trim()) { toast.error("Please enter a title"); return; }
    setCreating(true);
    try {
      const endsAtDate = new Date();
      endsAtDate.setDate(endsAtDate.getDate() + newDuration - 1);
      const inviteCode = genCode();

      const { data, error } = await db
        .from("challenges")
        .insert({
          creator_id: uid,
          title: newTitle.trim(),
          emoji: newEmoji || "🏆",
          duration_days: newDuration,
          starts_at: todayKey,
          ends_at: toDateKey(endsAtDate),
          invite_code: inviteCode,
        })
        .select()
        .single();

      if (error) { toast.error("Could not create challenge"); return; }

      await db.from("challenge_members").insert({
        challenge_id: data.id,
        user_id: uid,
        display_name: user.displayName || "Unnamed",
        total_done: 0,
      });

      toast.success(`${newEmoji || "🏆"} "${newTitle}" created!`, {
        description: `Invite code: ${inviteCode} — share it with friends!`,
      });
      setShowCreate(false);
      setNewTitle(""); setNewEmoji("🏆"); setNewDuration(30);
      loadChallenges();
    } finally {
      setCreating(false);
    }
  };

  const joinChallenge = async () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { toast.error("Enter a valid 6-character invite code"); return; }
    setJoining(true);
    try {
      const { data: challenge, error } = await db
        .from("challenges")
        .select("id, title, emoji")
        .eq("invite_code", code)
        .single();

      if (error || !challenge) { toast.error("Invalid invite code — check with your friend"); return; }

      const { error: joinErr } = await db.from("challenge_members").insert({
        challenge_id: challenge.id,
        user_id: uid,
        display_name: user.displayName || "Unnamed",
        total_done: 0,
      });

      if (joinErr) {
        if (joinErr.code === "23505") toast.info("You're already in this challenge!");
        else toast.error("Could not join challenge");
        return;
      }

      toast.success(`Joined "${challenge.title}"! 🎉`);
      setShowJoin(false);
      setJoinCode("");
      loadChallenges();
    } finally {
      setJoining(false);
    }
  };

  const markDone = async (challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    const myEntry = challenge?.members.find(m => m.userId === uid);
    if (!myEntry) return;
    if (myEntry.lastCompletedDate === todayKey) { toast.info("Already done today!"); return; }

    // Optimistic update so the button responds immediately
    setChallenges(prev => prev.map(c => c.id !== challengeId ? c : {
      ...c,
      members: c.members
        .map(m => m.userId !== uid ? m : { ...m, totalDone: m.totalDone + 1, lastCompletedDate: todayKey })
        .sort((a, b) => b.totalDone - a.totalDone),
    }));

    const { error } = await db
      .from("challenge_members")
      .update({ total_done: myEntry.totalDone + 1, last_completed_date: todayKey })
      .eq("challenge_id", challengeId)
      .eq("user_id", uid);

    if (error) { toast.error("Failed to save progress"); loadChallenges(true); }
    else toast.success("Done for today! 🔥");
  };

  const leaveChallenge = async (challengeId: string) => {
    await db.from("challenge_members").delete().eq("challenge_id", challengeId).eq("user_id", uid);
    setChallenges(prev => prev.filter(c => c.id !== challengeId));
    toast.success("Left challenge");
  };

  // ─── Leaderboard ────────────────────────────────────────────────────────────

  const leaderboard = [
    { userId: uid, displayName: user.displayName || "You", habitsDoneToday: myDoneToday, isMe: true, friendshipId: "" },
    ...friends.map(f => ({ ...f, isMe: false })),
  ].sort((a, b) => b.habitsDoneToday - a.habitsDoneToday);

  const maxDone = leaderboard[0]?.habitsDoneToday || 1;
  const friendIds = new Set(friends.map(f => f.userId));

  const getRelationship = (userId: string): "friend" | "pending_out" | "pending_in" | "none" => {
    if (friendIds.has(userId)) return "friend";
    if (outgoingIds.has(userId)) return "pending_out";
    if (incomingRequests.some(r => r.userId === userId)) return "pending_in";
    return "none";
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Friends</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => tab === "league" ? loadFriends(true) : loadChallenges(true)}
          disabled={refreshing || challengeLoading}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-card border border-transparent hover:border-border transition-smooth"
          title="Refresh"
        >
          <RefreshCw className={cn("w-4 h-4", (refreshing || challengeLoading) && "animate-spin")} />
        </button>
      </header>

      {/* Tab switcher */}
      <div className="bg-secondary rounded-2xl p-1 flex gap-1">
        {(["league", "challenges"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-smooth",
              tab === t
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "league"
              ? <Trophy className="w-3.5 h-3.5" />
              : <Swords className="w-3.5 h-3.5" />}
            {t === "league" ? "League" : "Challenges"}
          </button>
        ))}
      </div>

      {/* ── League tab ─────────────────────────────────────────────────────────── */}
      {tab === "league" && (
        <>
          {incomingRequests.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                  {incomingRequests.length}
                </span>
                Friend request{incomingRequests.length > 1 ? "s" : ""}
              </h2>
              {incomingRequests.map(req => (
                <div
                  key={req.friendshipId}
                  className="bg-card border border-primary/25 rounded-2xl p-3 flex items-center gap-3 shadow-soft"
                >
                  <Avatar name={req.displayName} />
                  <span className="flex-1 text-sm font-medium truncate">{req.displayName}</span>
                  <Button
                    size="sm"
                    className="rounded-xl gradient-primary text-xs shrink-0"
                    onClick={() => acceptRequest(req.friendshipId)}
                  >
                    Accept
                  </Button>
                  <button
                    onClick={() => declineRequest(req.friendshipId)}
                    className="text-muted-foreground hover:text-destructive transition-smooth px-1 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </section>
          )}

          <section className="bg-card border border-border rounded-3xl p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-warning" />
              <h2 className="font-semibold">Today's leaderboard</h2>
            </div>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : leaderboard.length === 1 ? (
              <div className="text-center py-6 space-y-2">
                <Users className="w-10 h-10 mx-auto text-muted-foreground/30" />
                <p className="text-sm font-medium">No friends yet</p>
                <p className="text-xs text-muted-foreground">
                  Search by display name or friend code below and add them!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, rank) => {
                  const medal = rank < 3 ? MEDALS[rank] : null;
                  const pct = Math.round((entry.habitsDoneToday / maxDone) * 100);
                  return (
                    <div
                      key={entry.userId}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl",
                        entry.isMe ? "bg-primary/10 border border-primary/20" : "bg-secondary/40"
                      )}
                    >
                      <div className="w-7 text-center shrink-0">
                        {medal
                          ? <span className="text-xl leading-none">{medal}</span>
                          : <span className="text-xs font-bold text-muted-foreground">#{rank + 1}</span>}
                      </div>
                      <Avatar name={entry.displayName} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate", entry.isMe && "text-primary")}>
                          {entry.isMe ? `${entry.displayName} (you)` : entry.displayName}
                        </p>
                        <div className="mt-1.5 h-1.5 w-full rounded-full bg-background overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-1">
                        <div className="text-xl font-bold leading-none">{entry.habitsDoneToday}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">done</div>
                      </div>
                      {!entry.isMe && (
                        <button
                          onClick={() => removeFriend(entry.friendshipId, entry.displayName)}
                          className="shrink-0 text-muted-foreground/30 hover:text-destructive transition-smooth p-1"
                          title="Remove friend"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Find friends</h2>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Display name or friend code (e.g. A7B3K2)…"
                className="pl-10 rounded-2xl"
              />
              {searching && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map(result => {
                  const rel = getRelationship(result.userId);
                  return (
                    <div
                      key={result.userId}
                      className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3 shadow-soft"
                    >
                      <Avatar name={result.displayName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{result.displayName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {result.friendCode ?? result.characterName}
                        </p>
                      </div>
                      {rel === "friend" && (
                        <span className="flex items-center gap-1 text-xs font-medium text-primary shrink-0">
                          <UserCheck className="w-3.5 h-3.5" /> Friends
                        </span>
                      )}
                      {rel === "pending_out" && (
                        <span className="text-xs text-muted-foreground italic shrink-0">Pending…</span>
                      )}
                      {rel === "pending_in" && (
                        <Button
                          size="sm"
                          className="rounded-xl gradient-primary text-xs shrink-0"
                          onClick={() => sendRequest(result.userId)}
                        >
                          Accept
                        </Button>
                      )}
                      {rel === "none" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs shrink-0"
                          onClick={() => sendRequest(result.userId)}
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" /> Add
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {query.trim() && !searching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found for "{query}".<br />
                <span className="text-xs">
                  Try their exact 6-character friend code (e.g. A7B3K2),<br />
                  or their display name set in Profile.
                </span>
              </p>
            )}
          </section>
        </>
      )}

      {/* ── Challenges tab ──────────────────────────────────────────────────────── */}
      {tab === "challenges" && (
        <>
          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={showCreate ? "default" : "outline"}
              className={cn(
                "flex-1 rounded-2xl text-xs",
                showCreate && "gradient-primary text-primary-foreground border-0"
              )}
              onClick={() => { setShowCreate(v => !v); setShowJoin(false); }}
            >
              {showCreate ? "✕ Cancel" : "+ Create challenge"}
            </Button>
            <Button
              size="sm"
              variant={showJoin ? "default" : "outline"}
              className={cn(
                "flex-1 rounded-2xl text-xs",
                showJoin && "gradient-primary text-primary-foreground border-0"
              )}
              onClick={() => { setShowJoin(v => !v); setShowCreate(false); }}
            >
              {showJoin ? "✕ Cancel" : "🔑 Join with code"}
            </Button>
          </div>

          {/* Create form */}
          {showCreate && (
            <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-4">
              <p className="font-semibold text-sm">New Challenge</p>
              <div className="flex gap-2">
                <Input
                  value={newEmoji}
                  onChange={e => setNewEmoji(e.target.value)}
                  className="w-16 rounded-xl text-center text-xl"
                  maxLength={2}
                  placeholder="🏆"
                />
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Challenge title…"
                  className="flex-1 rounded-xl"
                  onKeyDown={e => e.key === "Enter" && createChallenge()}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">Duration</p>
                <div className="flex gap-1.5">
                  {[7, 14, 21, 30].map(d => (
                    <button
                      key={d}
                      onClick={() => setNewDuration(d)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-semibold transition-smooth",
                        newDuration === d
                          ? "gradient-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full rounded-2xl gradient-primary text-primary-foreground"
                onClick={createChallenge}
                disabled={creating}
              >
                {creating
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : "Create & get invite code →"}
              </Button>
            </div>
          )}

          {/* Join form */}
          {showJoin && (
            <div className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-4">
              <p className="font-semibold text-sm">Join a Challenge</p>
              <Input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="6-character invite code…"
                className="rounded-xl font-mono tracking-widest uppercase text-center text-lg"
                maxLength={6}
                onKeyDown={e => e.key === "Enter" && joinChallenge()}
              />
              <Button
                className="w-full rounded-2xl gradient-primary text-primary-foreground"
                onClick={joinChallenge}
                disabled={joining}
              >
                {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join challenge →"}
              </Button>
            </div>
          )}

          {/* Challenge cards */}
          {challengeLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Swords className="w-12 h-12 mx-auto text-muted-foreground/20" />
              <p className="text-sm font-medium">No active challenges</p>
              <p className="text-xs text-muted-foreground">
                Create one or join a friend's challenge with their invite code!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {challenges.map(c => {
                const myEntry = c.members.find(m => m.userId === uid);
                const doneToday = myEntry?.lastCompletedDate === todayKey;
                const start = new Date(c.startsAt);
                const end = new Date(c.endsAt);
                const now = new Date();
                const dayNum = Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1);
                const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
                const maxMemberDone = Math.max(1, c.members[0]?.totalDone ?? 0);

                return (
                  <div key={c.id} className="bg-card border border-border rounded-3xl p-5 shadow-soft space-y-4">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center text-2xl shrink-0">
                        {c.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold leading-tight truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Day {dayNum}/{c.durationDays} · {daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                        </p>
                        {/* Progress bar */}
                        <div className="mt-2 h-1 w-full rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary/50 transition-all duration-700"
                            style={{ width: `${Math.round((dayNum / c.durationDays) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => leaveChallenge(c.id)}
                        className="text-muted-foreground/30 hover:text-destructive transition-smooth shrink-0 text-sm leading-none pt-0.5"
                        title="Leave challenge"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Member leaderboard */}
                    <div className="space-y-1">
                      {c.members.slice(0, 5).map((m, i) => {
                        const pct = Math.round((m.totalDone / maxMemberDone) * 100);
                        const medal = i < 3 ? MEDALS[i] : null;
                        const isMe = m.userId === uid;
                        return (
                          <div
                            key={m.userId}
                            className={cn(
                              "flex items-center gap-2 px-2 py-1.5 rounded-xl",
                              isMe && "bg-primary/10"
                            )}
                          >
                            <div className="w-5 text-center shrink-0">
                              {medal
                                ? <span className="text-sm leading-none">{medal}</span>
                                : <span className="text-[10px] font-bold text-muted-foreground">#{i + 1}</span>}
                            </div>
                            <p className={cn(
                              "text-xs font-medium truncate flex-1",
                              isMe && "text-primary"
                            )}>
                              {isMe ? `${m.displayName} (you)` : m.displayName}
                            </p>
                            <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden shrink-0">
                              <div
                                className="h-full rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="text-xs font-bold w-5 text-right shrink-0 text-muted-foreground">
                              {m.totalDone}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer: invite code + done button */}
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(c.inviteCode);
                          toast.success("Invite code copied!");
                        }}
                        className="flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground hover:text-foreground transition-smooth"
                        title="Copy invite code"
                      >
                        <Copy className="w-3 h-3" />
                        {c.inviteCode}
                      </button>
                      <Button
                        size="sm"
                        className={cn(
                          "ml-auto rounded-2xl text-xs shrink-0",
                          doneToday
                            ? "bg-secondary text-muted-foreground cursor-default"
                            : "gradient-primary text-primary-foreground"
                        )}
                        disabled={doneToday}
                        onClick={() => markDone(c.id)}
                      >
                        {doneToday
                          ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Done today</>
                          : "✓ Mark done today"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FriendsPage;
