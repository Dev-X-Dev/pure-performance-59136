import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Clock, Target, CheckCircle } from "lucide-react";

export default function Practice() {
  const [isActive, setIsActive] = useState(false);
  const [time, setTime] = useState(25 * 60); // 25 minutes in seconds
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime(time => time - 1);
      }, 1000);
    } else if (time === 0) {
      setIsActive(false);
      if (isBreak) {
        setTime(25 * 60); // Back to work session
        setIsBreak(false);
      } else {
        setSessions(s => s + 1);
        setTime(5 * 60); // Break time
        setIsBreak(true);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, time, isBreak]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => setIsActive(true);
  const handlePause = () => setIsActive(false);
  const handleReset = () => {
    setIsActive(false);
    setTime(25 * 60);
    setIsBreak(false);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Focus & Practice</h1>
          <p className="text-muted-foreground">
            Use the Pomodoro technique to maintain focus and track your study sessions
          </p>
        </div>

        {/* Pomodoro Timer */}
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Clock className="h-6 w-6" />
              {isBreak ? 'Break Time' : 'Focus Session'}
            </CardTitle>
            <CardDescription>
              {isBreak 
                ? 'Take a short break to recharge'
                : 'Stay focused on your current task'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Timer Display */}
              <div className="text-6xl font-bold text-primary">
                {formatTime(time)}
              </div>

              {/* Progress Ring */}
              <div className="flex justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      className="text-muted stroke-current"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      stroke="currentColor"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (time / (isBreak ? 5 * 60 : 25 * 60))}`}
                      className="text-primary stroke-current transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {Math.round((1 - time / (isBreak ? 5 * 60 : 25 * 60)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                {!isActive ? (
                  <Button onClick={handleStart} size="lg" className="gap-2">
                    <Play className="h-5 w-5" />
                    Start
                  </Button>
                ) : (
                  <Button onClick={handlePause} size="lg" variant="outline" className="gap-2">
                    <Pause className="h-5 w-5" />
                    Pause
                  </Button>
                )}
                <Button onClick={handleReset} size="lg" variant="outline" className="gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats and Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Today's Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary mb-2">{sessions}</div>
              <p className="text-sm text-muted-foreground">Sessions completed</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Focus time:</span>
                  <span>{sessions * 25} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Break time:</span>
                  <span>{sessions * 5} min</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Study Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Daily target: 4 sessions</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-full ${
                          i <= sessions ? 'bg-primary' : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((sessions / 4) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  📚 Review Notes
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  🧠 Take Quiz
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  ✍️ Practice Problems
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Study Tips */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Study Tips</CardTitle>
            <CardDescription>Make the most of your focus sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">During Focus Sessions:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Turn off notifications</li>
                  <li>• Focus on one task at a time</li>
                  <li>• Keep water nearby</li>
                  <li>• Take notes of key insights</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">During Breaks:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Stand up and stretch</li>
                  <li>• Look away from screens</li>
                  <li>• Take deep breaths</li>
                  <li>• Avoid social media</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}