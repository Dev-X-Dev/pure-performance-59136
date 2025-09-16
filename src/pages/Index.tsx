import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Brain, Users, Target, Star, ChevronRight } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950/20 dark:to-indigo-950/20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14,2 14,8 20,8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                NoteNest
              </h1>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Your AI-Powered
              <br />
              <span className="text-primary">Study Companion</span>
            </h2>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Transform your learning with intelligent note-taking, AI tutoring, collaborative study groups, 
              and personalized practice sessions. Study smarter, not harder.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                Get Started Free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-lg px-8 py-6"
                onClick={() => navigate('/auth')}
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold mb-4">Everything you need to excel</h3>
            <p className="text-xl text-muted-foreground">
              Powerful tools designed to enhance your learning experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <BookOpen className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Smart Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Organize your notes with tags, search, and AI-powered suggestions
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Brain className="h-10 w-10 text-primary mb-2" />
                <CardTitle>AI Tutor</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Get instant explanations, solve problems, and learn interactively
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Target className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Focus Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Pomodoro timer and productivity tools to maintain concentration
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Study Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Collaborate with classmates and share knowledge effectively
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold mb-4">Ready to transform your learning?</h3>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of students who are already studying smarter with NoteNest
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>AI-powered assistance</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>Collaborative learning</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span>Progress tracking</span>
            </div>
          </div>
          
          <Button 
            size="lg" 
            className="text-lg px-8 py-6"
            onClick={() => navigate('/auth')}
          >
            Start Learning Today
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
