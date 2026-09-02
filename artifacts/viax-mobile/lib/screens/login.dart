import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../api/api_client.dart';
import '../services/haptics.dart';
import '../state/auth_provider.dart';
import '../state/theme_provider.dart';
import '../theme/theme.dart';
import '../widgets/toast.dart';
import '../widgets/brand_mark.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _loading = false;
  bool _showPass = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    AppHaptics.tap();
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      AppHaptics.error();
      showToast(context, 'Credenciais inválidas.');
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AuthProvider>().login(_email.text.trim(), _password.text);
      if (mounted) {
        AppHaptics.success();
        context.go('/dashboard');
      }
    } on ApiError catch (e) {
      if (mounted) {
        AppHaptics.error();
        showToast(context, e.message);
      }
    } catch (_) {
      if (mounted) {
        AppHaptics.error();
        showToast(context, 'Credenciais inválidas.');
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final themeProv = context.watch<ThemeProvider>();
    final dark = themeProv.dark;

    return Scaffold(
      backgroundColor: context.bg,
      body: SafeArea(
        child: Stack(
          children: [
            Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(28, 24, 28, 24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 28),
                      const BrandMark(size: 52, withBackground: false),
                      const SizedBox(height: 24),
                      Text('Bem-vindo de volta.',
                          style: TextStyle(
                              fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.6, color: context.text)),
                      const SizedBox(height: 6),
                      Text('Entre com suas credenciais para continuar.',
                          style: TextStyle(fontSize: 13.5, color: context.textFaint, height: 1.5)),
                      const SizedBox(height: 32),
                      _label(context, 'Email'),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _email,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.email],
                        decoration: const InputDecoration(hintText: 'seu@email.com'),
                      ),
                      const SizedBox(height: 16),
                      _label(context, 'Senha'),
                      const SizedBox(height: 6),
                      TextField(
                        controller: _password,
                        obscureText: !_showPass,
                        textInputAction: TextInputAction.done,
                        autofillHints: const [AutofillHints.password],
                        onSubmitted: (_) => _submit(),
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          suffixIcon: IconButton(
                            icon: Icon(
                              _showPass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                              size: 18,
                              color: context.textFaint,
                            ),
                            onPressed: () => setState(() => _showPass = !_showPass),
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),
                      SizedBox(
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.pill)),
                          ),
                          child: _loading
                              ? Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    SizedBox(
                                      width: 15, height: 15,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2, color: Colors.white),
                                    ),
                                    SizedBox(width: 10),
                                    Text('Entrando...',
                                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                  ],
                                )
                              : Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: const [
                                    Text('Entrar',
                                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                    SizedBox(width: 8),
                                    Icon(Icons.arrow_forward, size: 16),
                                  ],
                                ),
                        ),
                      ),
                      const SizedBox(height: 22),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text('Ainda não tem conta? ',
                              style: TextStyle(fontSize: 13, color: context.textFaint)),
                          GestureDetector(
                            onTap: () => context.go('/register'),
                            child: Text('Criar conta grátis',
                                style: TextStyle(
                                    fontSize: 13, color: context.accent, fontWeight: FontWeight.w700)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            // Theme toggle — top-right, chrome-free icon only.
            Positioned(
              top: 4,
              right: 4,
              child: Material(
                color: context.surface,
                shape: CircleBorder(side: BorderSide(color: context.border)),
                child: InkWell(
                  customBorder: const CircleBorder(),
                  onTap: themeProv.toggle,
                  child: SizedBox(
                    width: 36,
                    height: 36,
                    child: Icon(
                      dark ? Icons.wb_sunny_outlined : Icons.nightlight_outlined,
                      size: 16,
                      color: context.textMuted,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(BuildContext c, String t) => Text(
        t.toUpperCase(),
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w600,
          letterSpacing: 1.2,
          color: c.textFaint,
        ),
      );
}
