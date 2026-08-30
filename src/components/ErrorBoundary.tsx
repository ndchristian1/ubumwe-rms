import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Ubumwe RMS error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md rounded-lg border bg-card p-6 text-center shadow-sm">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The app hit an unexpected problem. Please restart Ubumwe RMS.
            </p>
            <p className="mt-3 text-xs text-muted-foreground break-words">{this.state.error.message}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Reload App
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
