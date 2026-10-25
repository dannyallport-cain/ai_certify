import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

/**
 * Last line of defence for the app screens. A render error in a release build
 * otherwise leaves the user on a blank screen with no way back in, so the
 * failure is shown with a retry and logged to the device console.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled screen error:', error.message, error.stack, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-xl font-bold text-[#1A202C]">Something went wrong</Text>
        <Text className="mt-3 text-center text-sm leading-6 text-[#718096]">
          This screen could not be displayed. Your saved work is untouched.
        </Text>
        <Text className="mt-4 text-center text-xs leading-5 text-[#A0AEC0]">{error.message}</Text>

        <TouchableOpacity
          className="mt-8 rounded-2xl bg-[#0D47A1] px-8 py-4"
          onPress={this.handleRetry}
          accessibilityRole="button"
          activeOpacity={0.85}
        >
          <Text className="text-base font-semibold text-white">Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
