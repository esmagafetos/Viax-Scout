import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import 'screens/analysis_detail.dart';
import 'screens/dashboard.dart';
import 'screens/docs.dart';
import 'screens/history.dart';
import 'screens/login.dart';
import 'screens/process.dart';
import 'screens/register.dart';
import 'screens/server_status.dart';
import 'screens/settings.dart';
import 'screens/setup.dart';
import 'screens/tool.dart';
import 'state/auth_provider.dart';
import 'theme/theme.dart';
import 'widgets/layout.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();

/// Soft fade-only page transition used across the entire app — gives the
/// "Replit-like" smoothness the user requested. No slide, no scale, no zoom:
/// just opacity 0→1 over 220ms with an easeOutCubic curve so it feels native
/// and unobtrusive.
CustomTransitionPage<T> _fadePage<T>({
  required LocalKey key,
  required Widget child,
}) {
  return CustomTransitionPage<T>(
    key: key,
    child: child,
    transitionDuration: const Duration(milliseconds: 220),
    reverseTransitionDuration: const Duration(milliseconds: 180),
    transitionsBuilder: (_, animation, __, c) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(opacity: curved, child: c);
    },
  );
}

GoRouter createRouter(AuthProvider auth) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/setup',
    refreshListenable: auth,
    redirect: (ctx, state) {
      if (auth.loading) return null;
      final loc = state.matchedLocation;
      const publics = {'/login', '/register', '/setup'};
      final isPublic = publics.contains(loc);
      if (!auth.isAuthenticated && !isPublic) return '/login';
      if (auth.isAuthenticated && isPublic) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path: '/setup',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const SetupScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const LoginScreen()),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const RegisterScreen()),
      ),
      // The four tab-root screens live inside a StatefulShellRoute: one
      // Navigator per branch, so switching tabs preserves each screen's
      // scroll position and back stack instead of rebuilding it from
      // scratch. AppShell (widgets/layout.dart) supplies the bottom tab
      // bar and reads `navigationShell.currentIndex` for the active tab.
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/dashboard',
              pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const DashboardScreen()),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/process',
              pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const ProcessScreen()),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/history',
              pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const HistoryScreen()),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/docs',
              pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const DocsScreen()),
            ),
          ]),
        ],
      ),
      // Pushed on the root navigator — full-screen over the whole shell
      // (bottom tab bar included), with a native back button. These are
      // reached via `context.push(...)`, never a tab.
      GoRoute(
        path: '/history/:id',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (_, st) {
          final id = int.tryParse(st.pathParameters['id'] ?? '') ?? 0;
          return _fadePage(key: st.pageKey, child: AnalysisDetailScreen(id: id));
        },
      ),
      GoRoute(
        path: '/tool',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const ToolScreen()),
      ),
      GoRoute(
        path: '/settings',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const SettingsScreen()),
      ),
      GoRoute(
        path: '/server-status',
        parentNavigatorKey: _rootNavigatorKey,
        pageBuilder: (_, st) => _fadePage(key: st.pageKey, child: const ServerStatusScreen()),
      ),
    ],
    errorBuilder: (ctx, st) => Scaffold(
      backgroundColor: ctx.bg,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Página não encontrada', style: TextStyle(color: ctx.text, fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: () => ctx.go('/dashboard'), child: const Text('Voltar')),
          ],
        ),
      ),
    ),
  );
}
