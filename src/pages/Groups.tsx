import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, MessageCircle, BookOpen, Calendar } from "lucide-react";

export default function Groups() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Study Groups</h1>
            <p className="text-muted-foreground">
              Collaborate with others, share notes, and learn together
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </div>

        {/* Empty State for now */}
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-2xl font-semibold mb-2">Study Groups Coming Soon!</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Connect with classmates, share notes, and collaborate on assignments. 
            Study groups will help you learn better together.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Card className="p-4">
              <div className="text-2xl mb-2">💬</div>
              <h4 className="font-semibold mb-1">Discussion Forums</h4>
              <p className="text-sm text-muted-foreground">
                Ask questions and help each other understand difficult concepts
              </p>
            </Card>
            
            <Card className="p-4">
              <div className="text-2xl mb-2">📚</div>
              <h4 className="font-semibold mb-1">Shared Resources</h4>
              <p className="text-sm text-muted-foreground">
                Share notes, flashcards, and study materials with your group
              </p>
            </Card>
            
            <Card className="p-4">
              <div className="text-2xl mb-2">📅</div>
              <h4 className="font-semibold mb-1">Study Sessions</h4>
              <p className="text-sm text-muted-foreground">
                Schedule group study sessions and track progress together
              </p>
            </Card>
          </div>

          <div className="mt-8">
            <Button variant="outline" disabled>
              Join Beta Waitlist
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}