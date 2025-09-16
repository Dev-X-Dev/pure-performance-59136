import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/layout/AppLayout";
import { store } from "@/lib/store";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initialQ = params.get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  useEffect(() => setQ(initialQ), [initialQ]);
  const recents = store.get<string[]>("recent:topics", []);

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Student'}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your learning journey? Let's dive in.
          </p>
        </div>

        <Card>
          <CardHeader className="sticky top-[4.5rem] z-10 bg-card/60 backdrop-blur rounded-t-lg">
            <CardTitle>Quick Search</CardTitle>
            <CardDescription>
              Search any topic to explore notes, AI summaries, and practice.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!q.trim()) return;
                const next = [q, ...recents.filter((x) => x !== q)].slice(0, 8);
                store.set("recent:topics", next);
                navigate(`/explore?q=${encodeURIComponent(q)}`);
              }}
              className="flex w-full gap-2"
            >
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Try 'Photosynthesis' or 'Derivative rules'"
              />
              <Button type="submit">Search</Button>
            </form>
          </CardContent>
        </Card>

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Today's Agenda</CardTitle>
              <CardDescription>Your tasks for today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                No agenda items yet. Create your first note to get started!
              </div>
              <Link to="/notes">
                <Button className="w-full" variant="outline">
                  Create Note
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Focus Timer</CardTitle>
              <CardDescription>Start a Pomodoro session</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                25-minute sessions help improve focus and productivity.
              </div>
              <Link to="/practice">
                <Button className="w-full">Start Focus Session</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Recent Topics</CardTitle>
              <CardDescription>Jump back into what you were studying</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recents.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No recent topics yet. Start exploring!
                  </div>
                )}
                {recents.slice(0, 3).map((topic) => (
                  <Button
                    key={topic}
                    variant="secondary"
                    className="w-full justify-start"
                    onClick={() =>
                      navigate(`/explore?q=${encodeURIComponent(topic)}`)
                    }
                  >
                    {topic}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Study Stats</CardTitle>
              <CardDescription>Your progress overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Notes Created</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Study Sessions</span>
                  <span className="font-medium">0</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Topics Explored</span>
                  <span className="font-medium">{recents.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">AI Tutor</CardTitle>
              <CardDescription>Get personalized help</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                Ask questions, get explanations, and solve problems with AI assistance.
              </div>
              <Link to="/tutor">
                <Button className="w-full" variant="outline">
                  Ask AI Tutor
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Common tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link to="/notes" className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    📝 Create New Note
                  </Button>
                </Link>
                <Link to="/explore" className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    🔍 Explore Topics
                  </Button>
                </Link>
                <Link to="/practice" className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    🧘 Start Practice
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}