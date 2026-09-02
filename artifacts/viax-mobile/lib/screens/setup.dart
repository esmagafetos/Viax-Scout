import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../theme/theme.dart';
import '../widgets/brand_mark.dart';

class SetupScreen extends StatelessWidget {
  const SetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(28, 24, 28, 24),
          child: Column(
            children: [
              const Spacer(flex: 3),
              const BrandLockup(
                markSize: 84,
                wordmarkSize: 32,
                showSubtitle: true,
                horizontal: false,
              ),
              const SizedBox(height: 28),
              Text(
                'Auditoria inteligente de rotas logísticas.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: context.textMuted,
                  height: 1.4,
                ),
              ),
              const Spacer(flex: 4),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => context.go('/register'),
                  style: ElevatedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.pill)),
                  ),
                  child: const Text('Criar conta', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: OutlinedButton(
                  onPressed: () => context.go('/login'),
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.pill)),
                  ),
                  child: const Text('Já tenho conta', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                ),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}
