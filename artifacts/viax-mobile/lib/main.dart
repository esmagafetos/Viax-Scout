import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'api/api_client.dart';
import 'router.dart';
import 'screens/splash.dart';
import 'services/haptics.dart';
import 'state/auth_provider.dart';
import 'state/completion_notifications.dart';
import 'state/foreground_processing.dart';
import 'state/processing_service.dart';
import 'state/settings_provider.dart';
import 'state/theme_provider.dart';
import 'theme/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  ForegroundProcessing.initialize();
  // Inicializa o canal de notificações de conclusão antes do MaterialApp
  // — assim o tap em uma notificação que abre o app fria já encontra
  // o handler registrado.
  await CompletionNotifications.initialize();
  await initializeDateFormatting('pt_BR', null);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));

  final api = ApiClient();
  await api.init();

  final themeProv = ThemeProvider();
  await themeProv.load();

  await AppHaptics.load();

  runApp(ViaXApp(api: api, themeProv: themeProv));
}

class ViaXApp extends StatelessWidget {
  final ApiClient api;
  final ThemeProvider themeProv;
  const ViaXApp({
    super.key,
    required this.api,
    required this.themeProv,
  });

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: api),
        ChangeNotifierProvider<ThemeProvider>.value(value: themeProv),
        ChangeNotifierProvider(create: (_) => AuthProvider(api)..bootstrap()),
        ChangeNotifierProvider(create: (_) => SettingsProvider(api)),
        ChangeNotifierProvider(create: (_) => ProcessingService()),
      ],
      child: const _RouterHost(),
    );
  }
}

/// Owns the [GoRouter] instance. Split out from [ViaXApp] so the router is
/// built exactly once, in [initState] — not on every AuthProvider/ThemeProvider
/// rebuild.
///
/// The previous version called `createRouter(auth)` straight inside a
/// `Consumer2<AuthProvider, ThemeProvider>` builder, recreating the entire
/// `GoRouter` (a brand new object passed as `routerConfig`) every single
/// time either provider called `notifyListeners()` — including once per
/// login, since `AuthProvider.login()` notifies on success. Passing a new
/// router instance to `MaterialApp.router` tears down and rebuilds the
/// whole navigation tree, which — after the bottom-tab shell redesign —
/// means discarding and rebuilding all four tab Navigators (and re-running
/// their screens' data loads) at once. That full rebuild, landing right as
/// the user expects to land smoothly on the dashboard, is what showed up as
/// a stall right after connecting the account.
///
/// `createRouter` already wires `refreshListenable: auth`, which is
/// go_router's built-in mechanism for reacting to auth changes — it
/// re-evaluates `redirect` in place, without needing a new router object at
/// all. Building the router once and letting that mechanism do its job
/// keeps login (and every other auth change) fast.
class _RouterHost extends StatefulWidget {
  const _RouterHost();

  @override
  State<_RouterHost> createState() => _RouterHostState();
}

class _RouterHostState extends State<_RouterHost> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = createRouter(context.read<AuthProvider>());
    // Mantém a referência viva para que o tap em uma notificação de
    // conclusão consiga navegar.
    CompletionNotifications.router = _router;
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final theme = context.watch<ThemeProvider>();
    return MaterialApp.router(
      title: 'ViaX:Trace',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      themeMode: theme.mode,
      routerConfig: _router,
      builder: (ctx, child) {
        // While the auth bootstrap is in flight (cold start can take
        // 30-60s on Render free tier), hold a branded splash so the
        // app opens linearly instead of flashing login → dashboard.
        final body = auth.loading
            ? const SplashScreen()
            : (child ?? const SizedBox.shrink());
        return MediaQuery(
          data: MediaQuery.of(ctx).copyWith(textScaler: const TextScaler.linear(1.0)),
          child: DefaultTextStyle.merge(
            style: GoogleFonts.poppins(),
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 280),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              child: KeyedSubtree(
                key: ValueKey<bool>(auth.loading),
                child: body,
              ),
            ),
          ),
        );
      },
    );
  }
}
