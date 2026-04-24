import React, { type ReactNode } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) console.error('ErrorBoundary caught:', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    const stack = (this.state.error.stack ?? '').split('\n').slice(0, 12).join('\n');

    return (
      <View style={{ flex: 1, backgroundColor: '#1a0e08', padding: 24, paddingTop: 60 }}>
        <Text style={{ color: '#e8703a', fontSize: 11, letterSpacing: 1.4, fontFamily: 'Poppins_700Bold', marginBottom: 6 }}>
          ERRO INESPERADO
        </Text>
        <Text style={{ color: '#f0ede8', fontSize: 22, fontFamily: 'Poppins_700Bold', marginBottom: 6 }}>
          {this.state.error.name || 'Error'}
        </Text>
        <Text style={{ color: 'rgba(240,237,232,0.7)', fontSize: 14, fontFamily: 'Poppins_400Regular', marginBottom: 20 }}>
          {this.state.error.message}
        </Text>
        <ScrollView
          style={{ maxHeight: 220, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 12, marginBottom: 20 }}
        >
          <Text selectable style={{ color: 'rgba(240,237,232,0.5)', fontSize: 11, fontFamily: 'Poppins_400Regular' }}>
            {stack}
          </Text>
        </ScrollView>
        <Pressable
          onPress={this.reset}
          style={{
            backgroundColor: '#d4521a',
            paddingVertical: 12,
            borderRadius: 99,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontFamily: 'Poppins_600SemiBold', fontSize: 14 }}>Recarregar</Text>
        </Pressable>
      </View>
    );
  }
}
