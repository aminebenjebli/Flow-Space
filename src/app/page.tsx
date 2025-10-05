import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowRight, CheckCircle, Users, Zap, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900">
      {/* Header */}
      <header className="p-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 flow-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              FlowSpace
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Smart Task Management,{" "}
            <span className="text-blue-600">Simplified</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Boost your productivity with FlowSpace. Organize tasks, collaborate
            seamlessly, and achieve your goals with our intelligent task
            management platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Watch Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="text-center p-6 rounded-lg flow-card flow-card-hover transition-colors">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              Lightning Fast
            </h3>
            <p className="text-muted-foreground">
              Streamlined interface designed for speed and efficiency. Get more
              done in less time.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg flow-card flow-card-hover transition-colors">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              Team Collaboration
            </h3>
            <p className="text-muted-foreground">
              Real-time collaboration features to keep your team aligned and
              productive.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg flow-card flow-card-hover transition-colors">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground mb-2">
              Secure & Reliable
            </h3>
            <p className="text-muted-foreground">
              Enterprise-grade security with 99.9% uptime guarantee for your
              peace of mind.
            </p>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-20 flow-card rounded-2xl p-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-card-foreground mb-4">
              Why Choose FlowSpace?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of teams who have transformed their productivity
              with our intelligent task management platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-card-foreground">
                    Intelligent Task Prioritization
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    AI-powered suggestions to help you focus on what matters
                    most.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground">
                    Real-time Updates
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Stay in sync with instant notifications and live
                    collaboration.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground">
                    Customizable Workflows
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Adapt the platform to match your team's unique processes.
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground">
                    Advanced Analytics
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Gain insights into team performance and productivity trends.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground">
                    Mobile Optimized
                  </h4>
                  <p className="text-muted-foreground text-sm">
                    Full functionality across all devices and platforms.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground">24/7 Support</h4>
                  <p className="text-muted-foreground text-sm">
                    Expert support team ready to help you succeed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-20">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of teams already using FlowSpace to boost their
            productivity and achieve their goals.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8 py-4 h-auto">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
