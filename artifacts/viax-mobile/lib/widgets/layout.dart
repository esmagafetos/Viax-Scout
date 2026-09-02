import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../state/auth_provider.dart';
import '../state/processing_service.dart';
import '../state/theme_provider.dart';
import '../theme/theme.dart';
import '../services/haptics.dart';
import 'user_avatar.dart';

/// Native app shell: a bottom tab bar for the four destinations someone
/// actually taps every day (Dashboard, Processar, Histórico, Docs), plus a
/// slim top strip with just theme + account access. This replaces the old
/// layout, which mirrored the web's sticky top nav bar 1:1 — a website
/// pattern, not a mobile one. Wraps a [StatefulNavigationShell] from
/// go_router's `StatefulShellRoute.indexedStack`, so each tab keeps its own
/// scroll position and navigation stack when you switch away and back.
class AppShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;
  const AppShell({super.key, required this.navigationShell});

  static const _tabs = <_TabItem>[
    _TabItem(
      path: '/dashboard',
      icon: Icons.dashboard_outlined,
      activeIcon: Icons.dashboard_rounded,
      label: 'Início',
    ),
    _TabItem(
      path: '/process',
      icon: Icons.bolt_outlined,
      activeIcon: Icons.bolt_rounded,
      label: 'Processar',
    ),
    _TabItem(
      path: '/history',
      icon: Icons.history_outlined,
      activeIcon: Icons.history_rounded,
      label: 'Histórico',
    ),
    _TabItem(
      path: '/docs',
      icon: Icons.description_outlined,
      activeIcon: Icons.description_rounded,
      label: 'Docs',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final currentPath = _tabs[navigationShell.currentIndex].path;

    return Scaffold(
      backgroundColor: context.bg,
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Column(
              children: [
                _TopBar(
                  userName: user?.name ?? '',
                  userEmail: user?.email ?? '',
                  avatarUrl: user?.avatarUrl,
                ),
                Expanded(child: navigationShell),
              ],
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: ProcessingBanner(currentPath: currentPath),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: context.surface,
            border: Border(top: BorderSide(color: context.border)),
          ),
          child: NavigationBarTheme(
            data: NavigationBarThemeData(
              backgroundColor: Colors.transparent,
              surfaceTintColor: Colors.transparent,
              indicatorColor: context.accentDim,
              indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.pill)),
              height: 62,
              labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            ),
            child: NavigationBar(
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: (i) {
                AppHaptics.selection();
                navigationShell.goBranch(i, initialLocation: i == navigationShell.currentIndex);
              },
              destinations: [
                for (final tab in _tabs)
                  NavigationDestination(
                    icon: Icon(tab.icon),
                    selectedIcon: Icon(tab.activeIcon, color: context.accent),
                    label: tab.label,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TabItem {
  final String path;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  const _TabItem({required this.path, required this.icon, required this.activeIcon, required this.label});
}

/// Slim, chrome-free top strip — no logo, no nav (the bottom bar already
/// says where you are). Just the two things that need to be reachable from
/// anywhere: theme and account.
class _TopBar extends StatelessWidget {
  final String userName;
  final String userEmail;
  final String? avatarUrl;
  const _TopBar({required this.userName, required this.userEmail, this.avatarUrl});

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>();
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          _RoundIconButton(
            icon: theme.dark ? Icons.wb_sunny_outlined : Icons.nightlight_outlined,
            onTap: () {
              AppHaptics.selection();
              theme.toggle();
            },
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: () {
              AppHaptics.selection();
              showAccountSheet(context, name: userName, email: userEmail, avatarUrl: avatarUrl);
            },
            child: UserAvatar(
              name: userName,
              avatarUrl: avatarUrl,
              size: 34,
              fontSize: 13,
              border: Border.all(color: context.border, width: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _RoundIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _RoundIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.surface,
      shape: CircleBorder(side: BorderSide(color: context.border)),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(
          width: 34,
          height: 34,
          child: Icon(icon, size: 15, color: context.textMuted),
        ),
      ),
    );
  }
}

/// Opens the account bottom sheet — the native replacement for the old
/// dropdown menu. Configurações, status do servidor e documentação são
/// empurradas na navigator raiz (cobrem a tab bar, com botão de voltar);
/// sair encerra a sessão e volta pro login.
Future<void> showAccountSheet(
  BuildContext context, {
  required String name,
  required String email,
  String? avatarUrl,
}) {
  return showModalBottomSheet<void>(
    context: context,
    backgroundColor: Colors.transparent,
    builder: (sheetContext) => _AccountSheet(name: name, email: email, avatarUrl: avatarUrl),
  );
}

class _AccountSheet extends StatelessWidget {
  final String name;
  final String email;
  final String? avatarUrl;
  const _AccountSheet({required this.name, required this.email, this.avatarUrl});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.fromLTRB(10, 0, 10, 10),
        decoration: BoxDecoration(
          color: context.surface,
          borderRadius: BorderRadius.circular(AppRadii.xl),
          border: Border.all(color: context.borderStrong),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 10),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(color: context.border, borderRadius: BorderRadius.circular(AppRadii.pill)),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
              child: Row(
                children: [
                  UserAvatar(name: name, avatarUrl: avatarUrl, size: 42, fontSize: 15),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          name.isEmpty ? 'Sua conta' : name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14.5, color: context.text),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          email,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 12, color: context.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: context.border),
            _sheetTile(
              context,
              icon: Icons.settings_outlined,
              label: 'Configurações',
              onTap: () {
                Navigator.pop(context);
                context.push('/settings');
              },
            ),
            _sheetTile(
              context,
              icon: Icons.dns_outlined,
              label: 'Status do servidor',
              onTap: () {
                Navigator.pop(context);
                context.push('/server-status');
              },
            ),
            _sheetTile(
              context,
              icon: Icons.description_outlined,
              label: 'Documentação',
              onTap: () {
                Navigator.pop(context);
                context.go('/docs');
              },
            ),
            Divider(height: 1, color: context.border),
            _sheetTile(
              context,
              icon: Icons.logout,
              label: 'Sair',
              destructive: true,
              onTap: () async {
                Navigator.pop(context);
                await context.read<AuthProvider>().logout();
                if (context.mounted) context.go('/login');
              },
            ),
            const SizedBox(height: 6),
          ],
        ),
      ),
    );
  }

  Widget _sheetTile(
    BuildContext context, {
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    bool destructive = false,
  }) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        child: Row(
          children: [
            Icon(icon, size: 18, color: destructive ? context.accent : context.textMuted),
            const SizedBox(width: 14),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: destructive ? FontWeight.w700 : FontWeight.w500,
                color: destructive ? context.accent : context.text,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Content wrapper used inside every screen's `build()` — centers, caps the
/// width on tablets, and pads. Purely presentational: no header, no nav, no
/// scaffold of its own. Tab-root screens sit inside [AppShell]; pushed
/// screens sit inside [DetailScaffold].
class AppLayout extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  const AppLayout({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.fromLTRB(16, 12, 16, 32),
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1200),
          child: Padding(padding: padding, child: child),
        ),
      ),
    );
  }
}

/// Scaffold for screens reached by pushing on top of the tab shell
/// (Configurações, Status do servidor, Ferramenta, detalhe de análise) —
/// full-screen, with a native back button instead of duplicating the tab
/// bar or the old website nav.
class DetailScaffold extends StatelessWidget {
  final Widget child;
  final String currentPath;
  final EdgeInsetsGeometry padding;
  const DetailScaffold({
    super.key,
    required this.child,
    required this.currentPath,
    this.padding = const EdgeInsets.fromLTRB(16, 4, 16, 32),
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bg,
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(6, 4, 16, 0),
                  child: Row(
                    children: [
                      _RoundIconButton(
                        icon: Icons.arrow_back,
                        onTap: () {
                          if (Navigator.of(context).canPop()) {
                            Navigator.of(context).pop();
                          } else {
                            context.go('/dashboard');
                          }
                        },
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 1200),
                        child: Padding(padding: padding, child: child),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: ProcessingBanner(currentPath: currentPath),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Reusable card widgets (preservados) ──────────────────────────────
class CardSection extends StatelessWidget {
  final Widget? header;
  final Widget child;
  final EdgeInsetsGeometry padding;
  const CardSection({
    super.key,
    this.header,
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: context.surface,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        border: Border.all(color: context.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (header != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: context.border)),
              ),
              child: header!,
            ),
          Padding(padding: padding, child: child),
        ],
      ),
    );
  }
}

class CardHeaderLabel extends StatelessWidget {
  final String text;
  const CardHeaderLabel(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Text(
        text.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
          color: context.textMuted,
        ),
      );
}

/// Floating bottom banner shown whenever a processing job is active and the
/// user is on a different screen than the job's return path. Tapping it
/// navigates back to the originating screen.
class ProcessingBanner extends StatelessWidget {
  final String currentPath;
  const ProcessingBanner({super.key, required this.currentPath});

  @override
  Widget build(BuildContext context) {
    final svc = context.watch<ProcessingService>();
    final onSourceScreen = svc.returnPath == currentPath;
    final shouldShow = svc.active && !onSourceScreen;

    if (!shouldShow) return const SizedBox.shrink();

    final lastStep = svc.steps.isNotEmpty ? svc.steps.last : 'Processando…';

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
      child: Material(
        color: Colors.transparent,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: BackdropFilter(
            filter: ui.ImageFilter.blur(sigmaX: 14, sigmaY: 14),
            child: InkWell(
              onTap: () => context.go(svc.returnPath),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: context.surface.withValues(alpha: 0.92),
                  border: Border.all(color: context.borderStrong),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.18),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.4,
                        color: context.accent,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            svc.label,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w700,
                              color: context.text,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            lastStep,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              color: context.textFaint,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Icon(Icons.arrow_forward_ios, size: 13, color: context.textMuted),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
