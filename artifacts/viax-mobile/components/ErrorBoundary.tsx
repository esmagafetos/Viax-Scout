import { Component, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { reportError } from '@/lib/sentry';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Root-level error boundary. Catches render-phase exceptions anywhere
 * inside the app, prevents the white-screen-of-death and surfaces a
 * recoverable fallback UI.
 *
 * Errors are forwarded to `reportError()` (Sentry no-op when DSN absent).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    reportError(error, { componentStack: info.componentStack ?? undefined });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorFallback error={this.state.error} onReset={this.reset} />;
  }
}

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  // NB: cannot use hooks here — must work before ThemeProvider hydrates.
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>!</Text>
        </View>
        <Text style={styles.title}>Algo deu errado</Text>
        <Text style={styles.subtitle}>
          O aplicativo encontrou um erro inesperado. Tente recarregar a tela.
        </Text>

        <View style={styles.detailsBox}>
          <Text style={styles.detailsLabel}>Detalhes técnicos</Text>
          <Text selectable style={styles.detailsText}>
            {error.name}: {error.message}
          </Text>
          {error.stack ? (
            <Text selectable style={styles.stackText} numberOfLines={12}>
              {error.stack.split('\n').slice(0, 10).join('\n')}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={onReset}
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.buttonText}>Recarregar</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a0e08' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 14,
  },
  iconBox: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(220,38,38,0.15)',
    borderWidth: 2,
    borderColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#dc2626',
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
  },
  title: {
    color: '#f5e6d8',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  subtitle: {
    color: 'rgba(245,230,216,0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  detailsBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  detailsLabel: {
    color: 'rgba(245,230,216,0.5)',
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  detailsText: {
    color: '#f5e6d8',
    fontSize: 12.5,
    lineHeight: 18,
  },
  stackText: {
    color: 'rgba(245,230,216,0.5)',
    fontSize: 10.5,
    fontFamily: 'monospace',
    lineHeight: 14,
    marginTop: 6,
  },
  button: {
    marginTop: 18,
    backgroundColor: '#d4521a',
    borderRadius: 99,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
