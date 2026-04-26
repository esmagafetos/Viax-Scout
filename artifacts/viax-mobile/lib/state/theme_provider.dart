import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persisted theme mode (system/light/dark) with toggle helper that mirrors
/// the web app's `useTheme()` behavior: a single button cycles between
/// "Claro"/"Escuro" labels.
class ThemeProvider extends ChangeNotifier {
  static const _kKey = 'viax.themeMode';

  ThemeMode _mode = ThemeMode.system;
  ThemeMode get mode => _mode;

  /// Whether the current effective theme is dark (taking system into account
  /// when [_mode] is [ThemeMode.system]).
  bool get dark {
    if (_mode == ThemeMode.system) {
      final platformDark =
          WidgetsBinding.instance.platformDispatcher.platformBrightness ==
              Brightness.dark;
      return platformDark;
    }
    return _mode == ThemeMode.dark;
  }

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kKey);
    switch (raw) {
      case 'light':
        _mode = ThemeMode.light;
        break;
      case 'dark':
        _mode = ThemeMode.dark;
        break;
      default:
        _mode = ThemeMode.system;
    }
    notifyListeners();
  }

  Future<void> set(ThemeMode mode) async {
    _mode = mode;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _kKey,
      mode == ThemeMode.dark
          ? 'dark'
          : mode == ThemeMode.light
              ? 'light'
              : 'system',
    );
  }

  Future<void> toggle() async {
    final nowDark = dark;
    await set(nowDark ? ThemeMode.light : ThemeMode.dark);
  }
}
