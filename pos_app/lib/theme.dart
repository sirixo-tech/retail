import 'package:flutter/material.dart';

/// PosTheme defines the visual identity for the SelfX POS application:
/// Slate backgrounds, crisp contrast, warm action accents, and fluid surfaces.
class PosTheme {
  // Light Palette
  static const Color canvasLight = Color(0xFFF8FAFC);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceMutedLight = Color(0xFFF1F5F9);
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color inkLight = Color(0xFF0F172A);
  static const Color inkMutedLight = Color(0xFF64748B);
  static const Color inkFaintLight = Color(0xFF94A3B8);

  // Dark Palette
  static const Color canvasDark = Color(0xFF0B1220);
  static const Color surfaceDark = Color(0xFF111827);
  static const Color surfaceMutedDark = Color(0xFF1E293B);
  static const Color borderDark = Color(0xFF334155);
  static const Color inkDark = Color(0xFFF8FAFC);
  static const Color inkMutedDark = Color(0xFF94A3B8);
  static const Color inkFaintDark = Color(0xFF64748B);

  // Brand Accent (Warm Orange)
  static const Color accent = Color(0xFFEA580C);
  static const Color accentDeep = Color(0xFFC2410C);
  static const Color accentLight = Color(0xFFFB923C);
  static const Color payAccent = Color(0xFF16A34A);

  // Semantic Getters
  static Color get canvas => canvasLight;
  static Color get surface => surfaceLight;
  static Color get surfaceMuted => surfaceMutedLight;
  static Color get border => borderLight;
  static Color get ink => inkLight;
  static Color get inkMuted => inkMutedLight;
  static Color get inkFaint => inkFaintLight;

  // Radii
  static const double radiusSm = 10;
  static const double radiusMd = 14;
  static const double radiusLg = 18;
  static const double radiusXl = 24;

  static List<BoxShadow> cardShadow([Color? tint]) => [
        BoxShadow(
          color: (tint ?? Colors.black).withValues(alpha: 0.05),
          blurRadius: 16,
          offset: const Offset(0, 6),
        ),
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.02),
          blurRadius: 4,
          offset: const Offset(0, 1),
        ),
      ];

  static List<BoxShadow> buttonShadow(Color color) => [
        BoxShadow(
          color: color.withValues(alpha: 0.28),
          blurRadius: 16,
          offset: const Offset(0, 6),
        ),
      ];

  static LinearGradient brandGradient(Color color) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color.lerp(color, const Color(0xFF0F172A), 0.35)!,
          color,
          Color.lerp(color, Colors.white, 0.15)!,
        ],
      );

  static LinearGradient ctaGradient(Color color) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color.lerp(color, Colors.white, 0.1)!,
          color,
          Color.lerp(color, Colors.black, 0.12)!,
        ],
      );
}

// Backwards compatibility aliases
const orange = PosTheme.accent;
const orangeDeep = PosTheme.accentDeep;
const ink = PosTheme.inkLight;
const muted = PosTheme.inkMutedLight;
const line = PosTheme.borderLight;
const canvas = PosTheme.canvasLight;

String inr(int paise) {
  final rupees = paise / 100;
  return '₹${rupees.toStringAsFixed(2)}';
}

ThemeData posTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: PosTheme.accent,
    primary: PosTheme.accent,
    surface: PosTheme.surfaceLight,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: PosTheme.canvasLight,
    fontFamily: 'Roboto',
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: PosTheme.surfaceLight,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(PosTheme.radiusMd),
        borderSide: const BorderSide(color: PosTheme.borderLight),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(PosTheme.radiusMd),
        borderSide: const BorderSide(color: PosTheme.borderLight),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(PosTheme.radiusMd),
        borderSide: const BorderSide(color: PosTheme.accent, width: 1.8),
      ),
      labelStyle: const TextStyle(color: PosTheme.inkMutedLight, fontSize: 14),
      hintStyle: const TextStyle(color: PosTheme.inkFaintLight, fontSize: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: PosTheme.accent,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(PosTheme.radiusMd),
        ),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    cardTheme: CardThemeData(
      color: PosTheme.surfaceLight,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(PosTheme.radiusLg),
        side: const BorderSide(color: PosTheme.borderLight),
      ),
    ),
  );
}

class PayMark extends StatelessWidget {
  const PayMark({super.key, required this.child, this.radius = 10});
  final Widget child;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        gradient: const LinearGradient(
          colors: [PosTheme.accent, Color(0xFFF97316)],
        ),
      ),
      child: child,
    );
  }
}
